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
                'email': 'leader@scp.local',
                'first_name': 'Confession',
                'last_name': 'Leader',
                'password': 'LeaderPass123!@#',
                'role_name': Role.CONFESSION_LEADER,
            },
            {
                'email': 'member@scp.local',
                'first_name': 'Regular',
                'last_name': 'Member',
                'password': 'MemberPass123!@#',
                'role_name': Role.MEMBER,
            },
            {
                'email': 'auditor@scp.local',
                'first_name': 'Security',
                'last_name': 'Auditor',
                'password': 'AuditorPass123!@#',
                'role_name': Role.SECURITY_AUDITOR,
            },
            {
                'email': 'psychologist@scp.local',
                'first_name': 'Platform',
                'last_name': 'Psychologist',
                'password': 'PsychPass123!@#$',
                'role_name': Role.PSYCHOLOGIST,
            },
            {
                'email': 'itadmin@scp.local',
                'first_name': 'IT',
                'last_name': 'Admin',
                'password': 'ITAdminPass123!@#',
                'role_name': Role.IT_ADMIN,
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
