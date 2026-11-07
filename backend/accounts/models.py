from django.db import models
from django.conf import settings
from django.utils import timezone


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_otps"
    )

    otp_hash = models.CharField(max_length=255)

    expires_at = models.DateTimeField()

    attempts = models.PositiveIntegerField(default=0)

    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Password reset OTP for {self.user.username}"