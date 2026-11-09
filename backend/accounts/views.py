
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404

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
            "role": "HR Admin" if u.is_staff else "Employee",
        })


# =====================================================
# DASHBOARD
# =====================================================

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        return Response({
            "total_employees": Employee.objects.filter(
                status="Active"
            ).count(),

            "present_today": Attendance.objects.filter(
                date=today,
                status="Present"
            ).count(),

            "absent_today": Attendance.objects.filter(
                date=today,
                status="Absent"
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
            username__iexact=value
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

        user = request.user

        return Response({
            "detail": "Profile updated successfully.",
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.get_full_name() or user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "role": "HR Admin" if user.is_staff else "Employee"
            }
        })


# =====================================================
# HR ADMINISTRATOR MANAGEMENT
# =====================================================

class AdministratorListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    MAX_ADMINISTRATORS = 2

    def check_admin_permission(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Only HR administrators can manage administrators."},
                status=status.HTTP_403_FORBIDDEN
            )

        return None

    # GET: LIST ALL HR ADMINISTRATORS
    def get(self, request):
        permission_error = self.check_admin_permission(request)

        if permission_error:
            return permission_error

        User = get_user_model()

        administrators = User.objects.filter(
            is_staff=True
        ).order_by("id")

        data = [
            {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.get_full_name() or user.username,
                "email": user.email,
                "is_active": user.is_active,
                "is_current_user": user.id == request.user.id,
            }
            for user in administrators
        ]

        return Response({
            "count": len(data),
            "max_administrators": self.MAX_ADMINISTRATORS,
            "administrators": data,
        })

    # POST: CREATE A SECOND HR ADMINISTRATOR
    def post(self, request):
        permission_error = self.check_admin_permission(request)

        if permission_error:
            return permission_error

        User = get_user_model()

        username = str(request.data.get("username", "")).strip()
        first_name = str(request.data.get("first_name", "")).strip()
        last_name = str(request.data.get("last_name", "")).strip()
        email = str(request.data.get("email", "")).strip()
        password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        # Required field validation
        if not username or not email or not password:
            return Response(
                {
                    "detail": "Username, email and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Confirm password
        if password != confirm_password:
            return Response(
                {
                    "confirm_password": ["Passwords do not match."]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Username uniqueness
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {
                    "username": ["This username is already registered."]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Email uniqueness
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {
                    "email": ["This email address is already registered."]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate email format
        email_serializer = serializers.EmailField()

        try:
            email = email_serializer.run_validation(email)
        except serializers.ValidationError as exc:
            return Response(
                {"email": exc.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response(
                {"password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create account safely and enforce maximum of two admins.
        with transaction.atomic():

            admin_count = User.objects.filter(is_staff=True).count()

            if admin_count >= self.MAX_ADMINISTRATORS:
                return Response(
                    {
                        "detail": "Maximum of two HR administrator accounts allowed."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            administrator = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_superuser=False,
                is_active=True,
            )

        return Response(
            {
                "detail": "HR administrator created successfully.",
                "administrator": {
                    "id": administrator.id,
                    "username": administrator.username,
                    "first_name": administrator.first_name,
                    "last_name": administrator.last_name,
                    "full_name": (
                        administrator.get_full_name()
                        or administrator.username
                    ),
                    "email": administrator.email,
                    "is_active": administrator.is_active,
                    "is_staff": administrator.is_staff,
                }
            },
            status=status.HTTP_201_CREATED
        )




# =====================================================
# MANAGE INDIVIDUAL HR ADMINISTRATOR
# =====================================================

class AdministratorDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def check_admin_permission(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Only HR administrators can manage administrator accounts."},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def get_administrator(self, pk):
        User = get_user_model()

        return get_object_or_404(
            User,
            pk=pk,
            is_staff=True
        )

    # GET: VIEW SELECTED ADMINISTRATOR
    def get(self, request, pk):
        permission_error = self.check_admin_permission(request)
        if permission_error:
            return permission_error

        administrator = self.get_administrator(pk)

        return Response({
            "id": administrator.id,
            "username": administrator.username,
            "first_name": administrator.first_name,
            "last_name": administrator.last_name,
            "full_name": (
                administrator.get_full_name()
                or administrator.username
            ),
            "email": administrator.email,
            "is_active": administrator.is_active,
            "is_current_user": administrator.id == request.user.id,
        })

    # PATCH: UPDATE SELECTED ADMINISTRATOR PROFILE
    def patch(self, request, pk):
        permission_error = self.check_admin_permission(request)
        if permission_error:
            return permission_error

        administrator = self.get_administrator(pk)

        serializer = UpdateProfileSerializer(
            administrator,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "detail": "Administrator profile updated successfully.",
            "administrator": {
                "id": administrator.id,
                "username": administrator.username,
                "first_name": administrator.first_name,
                "last_name": administrator.last_name,
                "full_name": (
                    administrator.get_full_name()
                    or administrator.username
                ),
                "email": administrator.email,
                "is_active": administrator.is_active,
            }
        })

    # POST: SET SELECTED ADMINISTRATOR PASSWORD
    def post(self, request, pk):
        permission_error = self.check_admin_permission(request)
        if permission_error:
            return permission_error

        administrator = self.get_administrator(pk)

        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not new_password or not confirm_password:
            return Response(
                {
                    "detail": "New password and confirm password are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {
                    "confirm_password": ["Passwords do not match."]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user=administrator)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        administrator.set_password(new_password)
        administrator.save(update_fields=["password"])

        # Revoke the selected administrator's existing refresh tokens.
        for token in OutstandingToken.objects.filter(
            user=administrator
        ):
            BlacklistedToken.objects.get_or_create(token=token)

        return Response({
            "detail": (
                f"Password updated successfully for "
                f"{administrator.username}. They must sign in again."
            )
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
                {
                    "detail": "Unable to send OTP right now. Please try again later."
                },
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
                {
                    "detail": "Too many incorrect attempts. Please request a new OTP."
                },
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
                {
                    "detail": "Invalid or expired OTP. Please verify again."
                },
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
