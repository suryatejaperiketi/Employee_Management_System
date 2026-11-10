from django.db import models
from django.core.exceptions import ValidationError
from employees.models import Employee
class Attendance(models.Model):
    STATUSES = [(x,x) for x in ["Present","Absent","Half Day","On Leave","Holiday"]]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance")
    date = models.DateField()
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default="Present")
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["employee","date"], name="unique_employee_attendance_date")]
        indexes = [models.Index(fields=["date","status"])]
        ordering = ["-date","employee__first_name"]
    def __str__(self): return f"{self.employee} - {self.date}"
