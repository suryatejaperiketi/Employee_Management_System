from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Attendance
from .serializers import AttendanceSerializer
from accounts.permissions import HasCompletedFirstLogin

class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("employee", "employee__department").all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated, HasCompletedFirstLogin]
    filterset_fields = ["date", "status", "employee"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    ordering_fields = ["date", "check_in", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs
        employee = getattr(self.request.user, "employee_profile", None)
        return qs.filter(employee=employee) if employee else qs.none()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsHR()]
        return super().get_permissions()

    def _employee(self):
        return getattr(self.request.user, "employee_profile", None)

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        employee = self._employee()
        if not employee or employee.status != "Active":
            return Response({"detail": "No active employee profile is linked to this account."}, status=403)
        today = timezone.localdate()
        record, created = Attendance.objects.get_or_create(employee=employee, date=today, defaults={"check_in": timezone.localtime().time(), "status": "Present"})
        if not created:
            if record.check_in:
                return Response({"detail": "You have already checked in today."}, status=400)
            record.check_in = timezone.localtime().time()
            record.save(update_fields=["check_in", "updated_at"])
        return Response(AttendanceSerializer(record).data, status=201 if created else 200)

    @action(detail=False, methods=["post"], url_path="check-out")
    def check_out(self, request):
        employee = self._employee()
        if not employee:
            return Response({"detail": "No employee profile is linked to this account."}, status=403)
        today = timezone.localdate()
        record = Attendance.objects.filter(employee=employee, date=today).first()
        if not record or not record.check_in:
            return Response({"detail": "Check in before checking out."}, status=400)
        if record.check_out:
            return Response({"detail": "You have already checked out today."}, status=400)
        now = timezone.localtime().time()
        start = datetime.combine(today, record.check_in)
        end = datetime.combine(today, now)
        hours = max(0, (end-start).total_seconds()/3600)
        record.check_out = now
        record.working_hours = Decimal(str(round(hours, 2)))
        record.status = "Present" if hours >= 8 else ("Half Day" if hours >= 4 else "Absent")
        remarks = str(request.data.get("remarks", "")).strip()
        record.remarks = remarks
        record.save(update_fields=["check_out", "working_hours", "status", "remarks", "updated_at"])
        return Response(AttendanceSerializer(record).data)
