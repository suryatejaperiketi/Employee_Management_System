from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer
from accounts.permissions import HasCompletedFirstLogin

class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related("employee", "reviewed_by").all().order_by("-applied_at")
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated, HasCompletedFirstLogin]
    filterset_fields = ["status", "leave_type", "employee"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff:
            return qs
        employee = getattr(self.request.user, "employee_profile", None)
        return qs.filter(employee=employee) if employee else qs.none()

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsHR()]
        return super().get_permissions()

    def perform_create(self, serializer):
        if self.request.user.is_staff:
            if not serializer.validated_data.get("employee"):
                raise ValidationError({"employee": "Select an employee for this leave request."})
            serializer.save()
            return
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee or employee.status != "Active":
            raise PermissionDenied("No active employee profile is linked to this account.")
        serializer.save(employee=employee, status="Pending", reviewed_by=None, hr_remarks="")

    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user)
