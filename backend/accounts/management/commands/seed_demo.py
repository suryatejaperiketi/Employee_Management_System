from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from employees.models import Department, Employee

class Command(BaseCommand):
    help = "Create a development admin and sample HR data."
    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.get_or_create(username="admin", defaults={"email":"admin@example.com","is_staff":True,"is_superuser":True})
        if created:
            user.set_password("12345678")
            user.save()
        dept, _ = Department.objects.get_or_create(name="Engineering")
        if not Employee.objects.exists():
            Employee.objects.create(employee_id="EMP-0001", first_name="Demo", last_name="Employee",
                email="employee@example.com", department=dept, designation="Software Developer",
                joining_date="2026-01-01", employment_type="Full-time", salary=45000, status="Active")
        self.stdout.write(self.style.SUCCESS("Demo data ready. Development login: admin / 12345678"))
