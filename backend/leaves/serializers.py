from rest_framework import serializers
from .models import LeaveRequest

class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    class Meta:
        model = LeaveRequest
        fields = "__all__"
        read_only_fields = ["reviewed_by", "applied_at"]
    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        employee = attrs.get("employee", getattr(self.instance, "employee", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        if employee and start and end:
            qs = LeaveRequest.objects.filter(employee=employee, status="Approved",
                start_date__lte=end, end_date__gte=start)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists() and attrs.get("status", getattr(self.instance, "status", "Pending")) == "Approved":
                raise serializers.ValidationError("This employee already has an overlapping approved leave.")
        return attrs
