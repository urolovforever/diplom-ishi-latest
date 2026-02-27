from django.core.management.base import BaseCommand
from django.core.management import call_command

from accounts.models import CustomUser, Role
from confessions.models import Confession, Organization


class Command(BaseCommand):
    help = 'Seed database with test users, confessions, organizations, and sample data'

    def handle(self, *args, **options):
        # Ensure roles exist
        call_command('seed_roles')

        # --- Create confessions ---
        confession_data = [
            ("Islom konfessiyasi", "O'zbekiston Islom diniy tashkilotlari"),
            ("Xristian konfessiyasi", "O'zbekistondagi Xristian diniy tashkilotlar"),
            ("Yahudiy konfessiyasi", "O'zbekistondagi Yahudiy diniy tashkilotlar"),
        ]
        konfessiyalar = []
        for name, desc in confession_data:
            k, _ = Confession.objects.get_or_create(
                name=name,
                defaults={'description': desc},
            )
            konfessiyalar.append(k)
            self.stdout.write(f"  Konfessiya: {k.name}")

        # --- Create organizations (diniy tashkilotlar) ---
        dt_data = [
            (konfessiyalar[0], [
                ("Toshkent Jome masjidi", "Toshkent shahridagi Jome masjid"),
                ("Samarqand Bibi-Xonim masjidi", "Samarqand shahridagi masjid"),
            ]),
            (konfessiyalar[1], [
                ("Toshkent Pravoslav cherkovi", "Toshkent shahridagi cherkov"),
                ("Samarqand Protestant jamoasi", "Samarqand shahridagi jamoa"),
            ]),
            (konfessiyalar[2], [
                ("Buxoro sinagogasi", "Buxoro shahridagi sinagoga"),
            ]),
        ]
        diniy_tashkilotlar = []
        for confession, dts in dt_data:
            for name, desc in dts:
                dt, _ = Organization.objects.get_or_create(
                    name=name,
                    defaults={'confession': confession, 'description': desc},
                )
                diniy_tashkilotlar.append(dt)
                self.stdout.write(f"  DT: {dt.name} (confession: {confession.name})")

        # --- Create test users ---
        test_users = [
            {
                'email': 'admin@scp.local',
                'first_name': 'Admin',
                'last_name': 'User',
                'password': 'AdminPass123!',
                'role_name': Role.SUPER_ADMIN,
                'is_staff': True,
                'confession': None,
                'organization': None,
            },
            {
                'email': 'konfessiya@scp.local',
                'first_name': 'Konfessiya',
                'last_name': 'Rahbari',
                'password': 'AdminPass123!',
                'role_name': Role.KONFESSIYA_RAHBARI,
                'confession': konfessiyalar[0],
                'organization': None,
            },
            {
                'email': 'kxodim@scp.local',
                'first_name': 'Konfessiya',
                'last_name': 'Xodimi',
                'password': 'AdminPass123!',
                'role_name': Role.KONFESSIYA_XODIMI,
                'confession': konfessiyalar[0],
                'organization': None,
            },
            {
                'email': 'dtrahbar@scp.local',
                'first_name': 'DT',
                'last_name': 'Rahbar',
                'password': 'AdminPass123!',
                'role_name': Role.DT_RAHBAR,
                'confession': None,
                'organization': diniy_tashkilotlar[0],
            },
            {
                'email': 'dtxodim@scp.local',
                'first_name': 'DT',
                'last_name': 'Xodim',
                'password': 'AdminPass123!',
                'role_name': Role.DT_XODIMI,
                'confession': None,
                'organization': diniy_tashkilotlar[0],
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

        # Assign leaders to confessions and organizations
        try:
            konfessiya_rahbar = CustomUser.objects.get(email='konfessiya@scp.local')
            konfessiyalar[0].leader = konfessiya_rahbar
            konfessiyalar[0].save(update_fields=['leader'])

            dt_rahbar_user = CustomUser.objects.get(email='dtrahbar@scp.local')
            diniy_tashkilotlar[0].leader = dt_rahbar_user
            diniy_tashkilotlar[0].save(update_fields=['leader'])
        except CustomUser.DoesNotExist:
            pass

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created_count} users created.'
        ))
