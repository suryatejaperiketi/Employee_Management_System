from django.db import models
from rest_framework import viewsets, permissions
from .models import Holiday
from .serializers import HolidaySerializer
from accounts.permissions import HasCompletedFirstLogin

class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [permissions.IsAuthenticated, HasCompletedFirstLogin]
    filterset_fields = ["date", "scope", "department"]
    search_fields = ["name", "description"]
    ordering_fields = ["date", "name"]
    def get_queryset(self):
        qs = Holiday.objects.select_related("department").all()
        if self.request.user.is_staff:
            return qs
        employee = getattr(self.request.user, "employee_profile", None)
        if not employee:
            return Holiday.objects.none()
        return qs.filter(models.Q(scope="All") | models.Q(scope="Department", department=employee.department))
    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsHR()]
        return super().get_permissions()
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
