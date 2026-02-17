from django.core.management.base import BaseCommand
from django.core.management import call_command

from accounts.models import CustomUser, Role


class Command(BaseCommand):
    help = 'Seed database with test users and sample data'

    def handle(self, *args, **options):
        # Ensure roles exist
        call_command('seed_roles')

        test_users = [
            {
                'email': 'admin@scp.local',
                'first_name': 'Admin',
                'last_name': 'User',
                'password': 'AdminPass123!@#',
                'role_name': Role.SUPER_ADMIN,
                'is_staff': True,
            },
            {
                'email': 'rahbar@scp.local',
                'first_name': 'Qomita',
                'last_name': 'Rahbar',
                'password': 'RahbarPass123!@#',
                'role_name': Role.QOMITA_RAHBAR,
            },
            {
                'email': 'xodim@scp.local',
                'first_name': 'Qomita',
                'last_name': 'Xodimi',
                'password': 'XodimPass123!@#',
                'role_name': Role.QOMITA_XODIMI,
            },
            {
                'email': 'konfessiya@scp.local',
                'first_name': 'Konfessiya',
                'last_name': 'Rahbari',
                'password': 'KonfessiyaPass123!@#',
                'role_name': Role.KONFESSIYA_RAHBARI,
            },
            {
                'email': 'kxodim@scp.local',
                'first_name': 'Konfessiya',
                'last_name': 'Xodimi',
                'password': 'KXodimPass123!@#',
                'role_name': Role.KONFESSIYA_XODIMI,
            },
            {
                'email': 'adliya@scp.local',
                'first_name': 'Adliya',
                'last_name': 'Xodimi',
                'password': 'AdliyaPass123!@#',
                'role_name': Role.ADLIYA_XODIMI,
            },
            {
                'email': 'kengash@scp.local',
                'first_name': 'Kengash',
                'last_name': 'Azosi',
                'password': 'KengashPass123!@#',
                'role_name': Role.KENGASH_AZO,
            },
        ]

        created_count = 0
        for user_data in test_users:
            role_name = user_data.pop('role_name')
            password = user_data.pop('password')

            if CustomUser.objects.filter(email=user_data['email']).exists():
                self.stdout.write(f"  User {user_data['email']} already exists")
                continue

            role = Role.objects.get(name=role_name)
            user = CustomUser.objects.create_user(
                password=password,
                role=role,
                **user_data,
            )
            created_count += 1
            self.stdout.write(f"  Created user: {user.email} ({role_name})")

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} users created.'
        ))
