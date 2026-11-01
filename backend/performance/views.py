from rest_framework import viewsets, permissions
from .models import PerformanceReview
from .serializers import PerformanceReviewSerializer

class PerformanceReviewViewSet(viewsets.ModelViewSet):
    queryset = PerformanceReview.objects.select_related("employee").all().order_by("-review_date")
    serializer_class = PerformanceReviewSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    search_fields = ["employee__first_name", "employee__last_name"]
