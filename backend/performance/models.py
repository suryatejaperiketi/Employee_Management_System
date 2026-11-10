from django.db import models
from employees.models import Employee
class PerformanceReview(models.Model):
    PERIODS = [(x,x) for x in ["Monthly","Quarterly","Annual"]]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="reviews")
    period_type = models.CharField(max_length=20, choices=PERIODS)
    review_date = models.DateField()
    rating = models.PositiveSmallIntegerField()
    goals = models.TextField(blank=True)
    feedback = models.TextField(blank=True)
    reviewer = models.ForeignKey("auth.User", null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.employee} - {self.review_date}"
