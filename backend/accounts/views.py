from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count
from employees.models import Employee, Department
from attendance.models import Attendance
from leaves.models import LeaveRequest
from payroll.models import Payroll

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        u = request.user
        return Response({"id": u.id, "username": u.username, "full_name": u.get_full_name() or u.username,
                         "email": u.email, "is_staff": u.is_staff, "role": "HR Admin" if u.is_staff else "Employee"})

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        today = timezone.localdate()
        return Response({
            "total_employees": Employee.objects.filter(status="Active").count(),
            "present_today": Attendance.objects.filter(date=today, status="Present").count(),
            "absent_today": Attendance.objects.filter(date=today, status="Absent").count(),
            "pending_leaves": LeaveRequest.objects.filter(status="Pending").count(),
            "total_departments": Department.objects.count(),
            "pending_payroll": Payroll.objects.filter(status__in=["Draft", "Pending Approval"]).count(),
             "department_distribution": list(Department.objects.annotate(employee_count=Count("employees")).values("name", "employee_count")),
            "recent_employees": list(Employee.objects.select_related("department").order_by("-joining_date").values(
                "employee_id", "first_name", "last_name", "department__name", "designation", "joining_date", "status")[:8])
        })


from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import check_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        current = request.data.get("current_password", "")
        new = request.data.get("new_password", "")
        confirm = request.data.get("confirm_password", "")
        user = request.user
        if not check_password(current, user.password):
            return Response({"current_password": ["Current password is incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        if new != confirm:
            return Response({"confirm_password": ["New password and confirmation do not match."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new, user=user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new)
        user.save(update_fields=["password"])
        # Revoke all refresh tokens issued to this account. Existing access tokens
        # expire naturally within the configured short access-token lifetime.
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({"detail": "Password changed successfully. Please sign in again."})
