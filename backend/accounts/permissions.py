from rest_framework.permissions import BasePermission

class HasCompletedFirstLogin(BasePermission):
    message = "Change your temporary password before using the employee portal."
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or user.is_staff:
            return True
        profile = getattr(user, "employee_profile", None)
        return bool(profile and not profile.must_change_password)
