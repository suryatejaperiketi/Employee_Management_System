from rest_framework import serializers
from .models import PerformanceReview
class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    class Meta: model = PerformanceReview; fields = "__all__"
