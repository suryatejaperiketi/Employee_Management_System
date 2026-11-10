from django.db import models
from employees.models import Employee
class LeaveRequest(models.Model):
    TYPES = [(x,x) for x in ["Casual Leave","Sick Leave","Earned Leave","Unpaid Leave"]]
    STATUSES = [(x,x) for x in ["Pending","Approved","Rejected","Cancelled"]]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=30, choices=TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.PositiveSmallIntegerField(default=1)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUSES, default="Pending")
    hr_remarks = models.TextField(blank=True)
    reviewed_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.SET_NULL)
    applied_at = models.DateTimeField(auto_now_add=True)
    def clean(self):
        if self.end_date < self.start_date: from django.core.exceptions import ValidationError; raise ValidationError("End date cannot be before start date.")
