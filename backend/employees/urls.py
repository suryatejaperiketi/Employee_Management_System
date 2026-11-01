from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, DepartmentViewSet
router = DefaultRouter()
router.register("records", EmployeeViewSet, basename="employee")
router.register("departments", DepartmentViewSet, basename="department")
urlpatterns = router.urls
