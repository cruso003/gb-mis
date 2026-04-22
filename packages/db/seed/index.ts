import { PrismaClient } from '../src/generated';

import { INDICATOR_SEEDS } from './indicators';
import { ORG_UNIT_SEEDS, ORG_UNIT_GROUP_SEED } from './orgunits';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding org units...');
  for (const orgUnit of ORG_UNIT_SEEDS) {
    await prisma.orgUnit.upsert({
      where: { id: orgUnit.id },
      create: orgUnit,
      update: { name: orgUnit.name, lwepCovered: orgUnit.lwepCovered },
    });
  }
  console.log(`  Upserted ${ORG_UNIT_SEEDS.length} org units`);

  console.log('Seeding org unit groups...');
  await prisma.orgUnitGroup.upsert({
    where: { id: ORG_UNIT_GROUP_SEED.id as string },
    create: ORG_UNIT_GROUP_SEED,
    update: { name: ORG_UNIT_GROUP_SEED.name },
  });

  console.log('Seeding indicator catalog...');
  let created = 0;
  let skipped = 0;
  for (const indicator of INDICATOR_SEEDS) {
    const result = await prisma.indicator.upsert({
      where: { code: indicator.code },
      create: indicator,
      update: {
        name: indicator.name,
        description: indicator.description,
        periodicity: indicator.periodicity,
        disaggregations: indicator.disaggregations,
        custodianAgency: indicator.custodianAgency,
        leadMinistry: indicator.leadMinistry,
        formula: indicator.formula ?? undefined,
        active: indicator.active,
      },
    });
    if (result) created++;
    else skipped++;
  }
  console.log(`  Upserted ${created} indicators (${skipped} skipped)`);

  // Seed a dev admin user (dev only — never run in production)
  if (process.env['NODE_ENV'] !== 'production') {
    console.log('Seeding dev admin user...');
    const devUser = await prisma.user.upsert({
      where: { keycloakSubject: 'dev-admin-subject' },
      create: {
        id: '00000000-0000-0000-0000-000000000100',
        keycloakSubject: 'dev-admin-subject',
        displayName: 'Dev Admin',
        status: 'ACTIVE',
        mfaEnrolled: false,
        roles: {
          create: [
            {
              role: 'ADMIN',
              assignedById: '00000000-0000-0000-0000-000000000100',
            },
          ],
        },
        orgUnitScopes: {
          create: [
            {
              orgUnitId: '00000000-0000-0000-0000-000000000001',
              assignedById: '00000000-0000-0000-0000-000000000100',
            },
          ],
        },
      },
      update: {},
    });
    console.log(`  Dev user: ${devUser.displayName} (${devUser.id})`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
