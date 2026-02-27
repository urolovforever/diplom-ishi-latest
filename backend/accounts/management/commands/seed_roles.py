from django.core.management.base import BaseCommand

from accounts.models import Role


class Command(BaseCommand):
    help = 'Create default roles'

    def handle(self, *args, **options):
        roles = [
            (Role.SUPER_ADMIN, 'Tizimga to\'liq kirish huquqi'),
            (Role.QOMITA_RAHBAR, 'Qo\'mita rahbari - yuqori darajali ruxsatlar'),
            (Role.QOMITA_XODIMI, 'Qo\'mita xodimi - monitoring va audit'),
            (Role.KONFESSIYA_RAHBARI, 'Konfessiya rahbari - konfessiyalarni boshqarish'),
            (Role.KONFESSIYA_XODIMI, 'Konfessiya xodimi - oddiy kirish'),
            (Role.DT_RAHBAR, 'Diniy tashkilot rahbari - diniy tashkilotni boshqarish'),
            (Role.DT_XODIMI, 'Diniy tashkilot xodimi - oddiy kirish'),
        ]

        # Remove old roles that no longer exist
        Role.objects.filter(name__in=['adliya_xodimi', 'kengash_azo']).delete()

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
