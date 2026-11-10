from django.db import models
from employees.models import Department

class Holiday(models.Model):
    SCOPE_CHOICES = [("All", "All employees"), ("Department", "Department-specific")]
    name = models.CharField(max_length=150)
    date = models.DateField(db_index=True)
    description = models.TextField(blank=True)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="All")
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.CASCADE, related_name="holidays")
    created_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["date", "name"]
        constraints = [models.CheckConstraint(condition=(models.Q(scope="All", department__isnull=True) | models.Q(scope="Department", department__isnull=False)), name="holiday_scope_department_consistency")]
    def __str__(self): return f"{self.name} - {self.date}"
