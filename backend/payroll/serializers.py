from rest_framework import serializers
from .models import Payroll
class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    class Meta: model = Payroll; fields = "__all__"
