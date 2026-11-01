from rest_framework.routers import DefaultRouter
from .views import PerformanceReviewViewSet
router = DefaultRouter()
router.register("reviews", PerformanceReviewViewSet)
urlpatterns = router.urls
