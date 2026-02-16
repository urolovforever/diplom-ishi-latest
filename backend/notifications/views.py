from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsSuperAdmin
from .models import Notification, AlertConfig
from .serializers import NotificationSerializer, MarkReadSerializer, AlertConfigSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['notification_type', 'is_read']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        qs = Notification.objects.filter(recipient=request.user, is_read=False)
        if serializer.validated_data.get('all'):
            count = qs.update(is_read=True)
        elif serializer.validated_data.get('ids'):
            count = qs.filter(id__in=serializer.validated_data['ids']).update(is_read=True)
        else:
            return Response({'detail': 'Provide "ids" or "all": true.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'marked_read': count})


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})


class AlertConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = AlertConfigSerializer
    permission_classes = [IsSuperAdmin]
    queryset = AlertConfig.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AlertConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AlertConfigSerializer
    permission_classes = [IsSuperAdmin]
    queryset = AlertConfig.objects.all()
    lookup_field = 'pk'
