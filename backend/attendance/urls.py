from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet
router = DefaultRouter()
router.register("records", AttendanceViewSet)
urlpatterns = router.urls
