from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from accounts.views import MeView, DashboardView, ChangePasswordView, UpdateProfileView,ForgotPasswordView,VerifyOTPView,ResetPasswordView,AdministratorListCreateView,AdministratorDetailView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/auth/profile/", UpdateProfileView.as_view(), name="update_profile"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("api/auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("api/auth/administrators/", AdministratorListCreateView.as_view(), name="administrator_list_create"),
    path("api/auth/administrators/<int:pk>/", AdministratorDetailView.as_view(), name="administrator_detail"),
    path("api/auth/verify-otp/", VerifyOTPView.as_view(), name="verify_otp"),
    path("api/auth/reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    path("api/dashboard/", DashboardView.as_view(), name="dashboard"),
    path("api/employees/", include("employees.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/leaves/", include("leaves.urls")),
    path("api/payroll/", include("payroll.urls")),
    path("api/performance/", include("performance.urls")),
]
