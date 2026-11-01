from rest_framework import viewsets, permissions
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related("employee", "reviewed_by").all().order_by("-applied_at")
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ["status", "leave_type", "employee"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]

    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user)
