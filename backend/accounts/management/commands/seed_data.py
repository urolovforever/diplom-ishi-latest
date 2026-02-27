from django.core.management.base import BaseCommand
from django.core.management import call_command

from accounts.models import CustomUser, Role
from confessions.models import Organization


class Command(BaseCommand):
    help = 'Seed database with test users, organizations, and sample data'

    def handle(self, *args, **options):
        # Ensure roles exist
        call_command('seed_roles')

        # --- Create hierarchical organizations ---
        qomita, _ = Organization.objects.get_or_create(
            name="Din ishlari bo'yicha Qo'mita",
            defaults={'org_type': 'qomita', 'description': "O'zbekiston Respublikasi Din ishlari bo'yicha Qo'mita"},
        )
        self.stdout.write(f"  Qo'mita: {qomita.name}")

        konfessiya_data = [
            ("Islom konfessiyasi", "O'zbekiston Islom diniy tashkilotlari"),
            ("Xristian konfessiyasi", "O'zbekistondagi Xristian diniy tashkilotlar"),
            ("Yahudiy konfessiyasi", "O'zbekistondagi Yahudiy diniy tashkilotlar"),
        ]
        konfessiyalar = []
        for name, desc in konfessiya_data:
            k, _ = Organization.objects.get_or_create(
                name=name,
                defaults={'org_type': 'konfessiya', 'parent': qomita, 'description': desc},
            )
            konfessiyalar.append(k)
            self.stdout.write(f"  Konfessiya: {k.name}")

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
        for parent_k, dts in dt_data:
            for name, desc in dts:
                dt, _ = Organization.objects.get_or_create(
                    name=name,
                    defaults={'org_type': 'diniy_tashkilot', 'parent': parent_k, 'description': desc},
                )
                diniy_tashkilotlar.append(dt)
                self.stdout.write(f"  DT: {dt.name} (parent: {parent_k.name})")

        # --- Create test users ---
        test_users = [
            {
                'email': 'admin@scp.local',
                'first_name': 'Admin',
                'last_name': 'User',
                'password': 'AdminPass123!',
                'role_name': Role.SUPER_ADMIN,
                'is_staff': True,
                'confession': qomita,
            },
            {
                'email': 'rahbar@scp.local',
                'first_name': 'Qomita',
                'last_name': 'Rahbar',
                'password': 'AdminPass123!',
                'role_name': Role.QOMITA_RAHBAR,
                'confession': qomita,
            },
            {
                'email': 'xodim@scp.local',
                'first_name': 'Qomita',
                'last_name': 'Xodimi',
                'password': 'AdminPass123!',
                'role_name': Role.QOMITA_XODIMI,
                'confession': qomita,
            },
            {
                'email': 'konfessiya@scp.local',
                'first_name': 'Konfessiya',
                'last_name': 'Rahbari',
                'password': 'AdminPass123!',
                'role_name': Role.KONFESSIYA_RAHBARI,
                'confession': konfessiyalar[0],
            },
            {
                'email': 'kxodim@scp.local',
                'first_name': 'Konfessiya',
                'last_name': 'Xodimi',
                'password': 'AdminPass123!',
                'role_name': Role.KONFESSIYA_XODIMI,
                'confession': konfessiyalar[0],
            },
            {
                'email': 'dtrahbar@scp.local',
                'first_name': 'DT',
                'last_name': 'Rahbar',
                'password': 'AdminPass123!',
                'role_name': Role.DT_RAHBAR,
                'confession': diniy_tashkilotlar[0],
            },
            {
                'email': 'dtxodim@scp.local',
                'first_name': 'DT',
                'last_name': 'Xodim',
                'password': 'AdminPass123!',
                'role_name': Role.DT_XODIMI,
                'confession': diniy_tashkilotlar[0],
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

        # Assign leaders to organizations
        try:
            qomita_rahbar = CustomUser.objects.get(email='rahbar@scp.local')
            qomita.leader = qomita_rahbar
            qomita.save(update_fields=['leader'])

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
