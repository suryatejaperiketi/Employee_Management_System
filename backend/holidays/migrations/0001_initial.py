from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = [("employees", "0002_employee_login_link"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="Holiday", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("name", models.CharField(max_length=150)), ("date", models.DateField(db_index=True)),
        ("description", models.TextField(blank=True)), ("scope", models.CharField(choices=[("All", "All employees"), ("Department", "Department-specific")], default="All", max_length=20)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
        ("department", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="holidays", to="employees.department")),
    ], options={"ordering": ["date", "name"]}),
    migrations.AddConstraint(model_name="holiday", constraint=models.CheckConstraint(condition=models.Q(models.Q(('department__isnull', True), ('scope', 'All')), models.Q(('department__isnull', False), ('scope', 'Department')), _connector='OR'), name="holiday_scope_department_consistency"))]
