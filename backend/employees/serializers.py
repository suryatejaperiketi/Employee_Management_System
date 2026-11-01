from rest_framework import serializers
from .models import Employee, Department

class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "description", "employee_count"]

class EmployeeSerializer(serializers.ModelSerializer):
    def validate_phone(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if value and (len(digits) != 10 or not value.isdigit()):
            raise serializers.ValidationError("Phone number must contain exactly 10 digits.")
        return value

    department_name = serializers.CharField(source="department.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
