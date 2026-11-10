from datetime import datetime
from rest_framework import serializers
from .models import Attendance

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_code = serializers.CharField(source="employee.employee_id", read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True)
    class Meta:
        model = Attendance
        fields = "__all__"
    def validate(self, attrs):
        check_in = attrs.get("check_in", getattr(self.instance, "check_in", None))
        check_out = attrs.get("check_out", getattr(self.instance, "check_out", None))
        if check_in and check_out:
            start = datetime.combine(attrs.get("date", getattr(self.instance, "date", None)), check_in)
            end = datetime.combine(attrs.get("date", getattr(self.instance, "date", None)), check_out)
            if end < start:
                raise serializers.ValidationError("Check-out cannot be earlier than check-in.")
            attrs["working_hours"] = round((end - start).total_seconds() / 3600, 2)
        return attrs
