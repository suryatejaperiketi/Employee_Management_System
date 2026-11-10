from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
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

    @action(detail=True, methods=["post"], url_path="create-login")
    def create_login(self, request, pk=None):
        employee = self.get_object()
        if employee.user_id:
            return Response({"detail": "This employee already has a login account."}, status=status.HTTP_400_BAD_REQUEST)
        if employee.status != "Active":
            return Response({"detail": "Only active employees can receive login accounts."}, status=status.HTTP_400_BAD_REQUEST)
        username = str(request.data.get("username", "")).strip()
        password = request.data.get("temporary_password", "")
        if not username or not password:
            return Response({"detail": "Username and temporary password are required."}, status=status.HTTP_400_BAD_REQUEST)
        User = get_user_model()
        if User.objects.filter(username__iexact=username).exists():
            return Response({"username": ["This username is already in use."]}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=employee.email).exists():
            return Response({"email": ["This email already belongs to another login account."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response({"temporary_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=username, email=employee.email,
            first_name=employee.first_name, last_name=employee.last_name,
            password=password, is_staff=False, is_superuser=False, is_active=True
        )
        employee.user = user
        employee.must_change_password = True
        employee.save(update_fields=["user", "must_change_password"])
        return Response({"detail": "Employee login created. Share the username and temporary password privately.", "username": user.username}, status=status.HTTP_201_CREATED)


    def perform_update(self, serializer):
        employee = serializer.save()
        if employee.user_id:
            employee.user.is_active = employee.status == "Active"
            employee.user.save(update_fields=["is_active"])

    def perform_destroy(self, instance):
        if instance.user_id:
            instance.user.is_active = False
            instance.user.save(update_fields=["is_active"])
        instance.delete()

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.annotate(employee_count=Count("employees")).all().order_by("name")
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsHR]
    search_fields = ["name", "description"]
