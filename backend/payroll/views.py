from rest_framework import viewsets, permissions
from .models import Payroll
from .serializers import PayrollSerializer

class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.select_related("employee").all().order_by("-period", "employee__first_name")
    serializer_class = PayrollSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    filterset_fields = ["period", "status", "employee"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
