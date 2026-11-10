from rest_framework import serializers
from .models import Holiday

class HolidaySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    class Meta:
        model = Holiday
        fields = ["id", "name", "date", "description", "scope", "department", "department_name", "created_at"]
    def validate(self, attrs):
        scope = attrs.get("scope", getattr(self.instance, "scope", "All"))
        department = attrs.get("department", getattr(self.instance, "department", None))
        if scope == "All" and department:
            raise serializers.ValidationError({"department": "Company-wide holidays must not select a department."})
        if scope == "Department" and not department:
            raise serializers.ValidationError({"department": "Select a department for department-specific holidays."})
        return attrs
