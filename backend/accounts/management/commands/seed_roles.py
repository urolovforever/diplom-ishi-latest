from django.core.management.base import BaseCommand

from accounts.models import Role


class Command(BaseCommand):
    help = 'Create default roles'

    def handle(self, *args, **options):
        roles = [
            (Role.SUPER_ADMIN, 'Full system access'),
            (Role.QOMITA_RAHBAR, 'Committee leader with elevated permissions'),
            (Role.CONFESSION_LEADER, 'Manages confessions and related processes'),
            (Role.MEMBER, 'Basic member access'),
            (Role.SECURITY_AUDITOR, 'Security monitoring and audit access'),
            (Role.PSYCHOLOGIST, 'Read-only access to confessions for psychological support'),
            (Role.IT_ADMIN, 'IT infrastructure and AI system administration'),
        ]

        created_count = 0
        for name, description in roles:
            _, created = Role.objects.get_or_create(
                name=name,
                defaults={'description': description},
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created role: {name}')

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} roles created, {len(roles) - created_count} already existed.'
        ))
