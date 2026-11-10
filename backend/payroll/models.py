from django.db import models
from employees.models import Employee
class Payroll(models.Model):
    STATUSES = [(x,x) for x in ["Draft","Pending Approval","Approved","Paid"]]
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name="payroll_records")
    period = models.CharField(max_length=7, help_text="YYYY-MM")
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default="Draft")
    paid_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["employee","period"], name="unique_employee_payroll_period")]
    def save(self, *args, **kwargs):
        self.net_salary = self.basic_salary + self.allowances - self.deductions - self.tax_deductions
        super().save(*args, **kwargs)
