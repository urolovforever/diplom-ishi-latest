import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def cleanup_inactive_invited_users():
    """Delete users who were invited but never logged in within 3 days.

    Also clears leader assignments from Confession/Organization if the user
    was assigned as a leader.
    """
    from .models import CustomUser
    from confessions.models import Confession, Organization

    cutoff = timezone.now() - timedelta(days=3)

    # Users who: created > 3 days ago, never logged in, never set password
    expired_users = CustomUser.objects.filter(
        created_at__lte=cutoff,
        last_login__isnull=True,
    ).exclude(
        is_superuser=True,
    )

    count = 0
    for user in expired_users:
        if not user.has_usable_password():
            # Clear leader assignments
            Confession.objects.filter(leader=user).update(leader=None)
            Organization.objects.filter(leader=user).update(leader=None)

            logger.info(
                'Deleting inactive invited user: %s (created: %s)',
                user.email, user.created_at,
            )
            user.delete()
            count += 1

    logger.info('Cleanup complete: %d inactive invited users deleted.', count)
    return count


@shared_task
def cleanup_old_sessions():
    """Delete session records older than 1 month."""
    from .security import SecurityManager

    count = SecurityManager.cleanup_old_sessions()
    logger.info('Session cleanup complete: %d old sessions deleted.', count)
    return count
