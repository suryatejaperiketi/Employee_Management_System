
import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from django.core.mail import send_mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.db.models import Count

from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)

from employees.models import Employee, Department
from attendance.models import Attendance
from leaves.models import LeaveRequest
from payroll.models import Payroll

from .models import PasswordResetOTP
from .serializers import (
    ForgotPasswordSerializer,
    VerifyOTPSerializer,
    ResetPasswordSerializer,
)


# =====================================================
# CURRENT USER DETAILS
# =====================================================

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user

        return Response({
            "id": u.id,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "full_name": u.get_full_name() or u.username,
            "email": u.email,
            "is_staff": u.is_staff,
            "role": "HR Admin" if u.is_staff else "Employee"
        })


# =====================================================
# DASHBOARD
# =====================================================

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        return Response({
            "total_employees": Employee.objects.filter(status="Active").count(),
            "present_today": Attendance.objects.filter(
                date=today, status="Present"
            ).count(),
            "absent_today": Attendance.objects.filter(
                date=today, status="Absent"
            ).count(),
            "pending_leaves": LeaveRequest.objects.filter(
                status="Pending"
            ).count(),
            "total_departments": Department.objects.count(),
            "pending_payroll": Payroll.objects.filter(
                status__in=["Draft", "Pending Approval"]
            ).count(),

            "department_distribution": list(
                Department.objects.annotate(
                    employee_count=Count("employees")
                ).values("name", "employee_count")
            ),

            "recent_employees": list(
                Employee.objects.select_related("department")
                .order_by("-joining_date")
                .values(
                    "employee_id",
                    "first_name",
                    "last_name",
                    "department__name",
                    "designation",
                    "joining_date",
                    "status"
                )[:8]
            )
        })


# =====================================================
# CHANGE PASSWORD - AUTHENTICATED USER
# =====================================================

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password", "")
        new = request.data.get("new_password", "")
        confirm = request.data.get("confirm_password", "")

        user = request.user

        if not check_password(current, user.password):
            return Response(
                {"current_password": ["Current password is incorrect."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new != confirm:
            return Response(
                {"confirm_password": [
                    "New password and confirmation do not match."
                ]},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new)
        user.save(update_fields=["password"])

        # Revoke existing refresh tokens.
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        return Response({
            "detail": "Password changed successfully. Please sign in again."
        })


# =====================================================
# UPDATE ADMINISTRATOR PROFILE
# =====================================================

class UpdateProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = ["username", "first_name", "last_name", "email"]

    def validate_username(self, value):
        user = self.instance

        if get_user_model().objects.exclude(pk=user.pk).filter(
            username=value
        ).exists():
            raise serializers.ValidationError(
                "This username is already taken."
            )

        return value

    def validate_email(self, value):
        user = self.instance

        if value and get_user_model().objects.exclude(pk=user.pk).filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "This email address is already registered."
            )

        return value


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "detail": "Profile updated successfully.",
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "full_name": request.user.get_full_name() or request.user.username,
                "email": request.user.email,
                "is_staff": request.user.is_staff,
                "role": "HR Admin" if request.user.is_staff else "Employee"
            }
        })


# =====================================================
# FORGOT PASSWORD - SEND OTP
# =====================================================

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()

        response_message = {
            "detail": "If an account exists with this email, an OTP will be sent."
        }

        if not user or not user.email:
            return Response(response_message)

        # Generate six-digit OTP.
        otp = f"{secrets.randbelow(1000000):06d}"

        # Remove previous OTP records.
        PasswordResetOTP.objects.filter(user=user).delete()

        # Save hashed OTP with five-minute expiry.
        PasswordResetOTP.objects.create(
            user=user,
            otp_hash=make_password(otp),
            expires_at=timezone.now() + timedelta(minutes=5)
        )

        try:
            send_mail(
                subject="HR Management System - Password Reset OTP",
                message=(
                    f"Hello {user.first_name or user.username},\n\n"
                    f"Your password reset OTP is: {otp}\n\n"
                    "This OTP expires in 5 minutes.\n"
                    "Please do not share this OTP with anyone."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False
            )

        except Exception:
            PasswordResetOTP.objects.filter(user=user).delete()

            return Response(
                {"detail": "Unable to send OTP right now. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(response_message)


# =====================================================
# VERIFY OTP
# =====================================================

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record = PasswordResetOTP.objects.filter(
            user=user
        ).first()

        if (
            not otp_record
            or otp_record.is_verified
            or otp_record.is_expired()
        ):
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record.attempts >= 5:
            otp_record.delete()

            return Response(
                {"detail": "Too many incorrect attempts. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not check_password(otp, otp_record.otp_hash):
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])

            return Response(
                {"detail": "Incorrect OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        return Response({
            "detail": "OTP verified successfully. You can now reset your password."
        })


# =====================================================
# RESET PASSWORD
# =====================================================

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]
        new_password = serializer.validated_data["new_password"]

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {"detail": "Invalid or expired OTP."},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            is_verified=True
        ).first()

        if (
            not otp_record
            or otp_record.is_expired()
            or not check_password(otp, otp_record.otp_hash)
        ):
            return Response(
                {"detail": "Invalid or expired OTP. Please verify again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password.
        user.set_password(new_password)
        user.save(update_fields=["password"])

        # Delete used OTP.
        otp_record.delete()

        # Revoke all existing refresh tokens.
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)

        return Response({
            "detail": "Password reset successfully. Please sign in with your new password."
        })
