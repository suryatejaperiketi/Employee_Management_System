from django.db import models
class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    def __str__(self): return self.name

class Employee(models.Model):
    EMPLOYMENT_TYPES = [(x,x) for x in ["Full-time","Part-time","Contract","Intern"]]
    STATUSES = [(x,x) for x in ["Active","Inactive","On Notice"]]
    employee_id = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="employees", null=True, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    joining_date = models.DateField()
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES, default="Full-time")
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default="Active")
    emergency_contact = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    @property
    def full_name(self): return f"{self.first_name} {self.last_name}"
    def __str__(self): return f"{self.employee_id} - {self.full_name}"
