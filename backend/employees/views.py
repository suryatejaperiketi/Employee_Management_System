from django.db.models import Count
from rest_framework import viewsets, permissions
from .models import Employee, Department
from .serializers import EmployeeSerializer, DepartmentSerializer

class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("department").all().order_by("-created_at")
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsHR]
    search_fields = ["employee_id", "first_name", "last_name", "email", "designation"]
    filterset_fields = ["department", "status", "employment_type"]
    ordering_fields = ["joining_date", "first_name", "salary"]

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.annotate(employee_count=Count("employees")).all().order_by("name")
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsHR]
    search_fields = ["name", "description"]
