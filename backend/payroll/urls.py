from rest_framework.routers import DefaultRouter
from .views import PayrollViewSet
router = DefaultRouter()
router.register("records", PayrollViewSet)
urlpatterns = router.urls
