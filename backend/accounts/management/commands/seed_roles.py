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
            (Role.ADLIYA_XODIMI, 'Adliya xodimi - huquqiy hujjatlar'),
            (Role.KENGASH_AZO, 'Kengash a\'zosi - kengash materiallari'),
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
