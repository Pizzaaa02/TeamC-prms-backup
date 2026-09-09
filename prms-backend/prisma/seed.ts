import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: './prisma/dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding roles...');
  for (const name of ['Admin', 'Landlord', 'Tenant', 'Agent']) {
    await prisma.role.upsert({ where: { name }, create: { name }, update: {} });
  }

  const bcrypt = await import('bcryptjs');
  const hash = (p: string) => bcrypt.default.hash(p, 10);

  console.log('Seeding users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@prms.com' },
    create: {
      email: 'admin@prms.com', passwordHash: await hash('Admin123!'),
      firebase_uid: 'admin-001', full_name: 'System Admin', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Admin' } } }] },
    },
    update: { passwordHash: await hash('Admin123!'), full_name: 'System Admin' },
  });

  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@prms.com' },
    create: {
      email: 'landlord@prms.com', passwordHash: await hash('Landlord123!'),
      firebase_uid: 'landlord-001', full_name: 'John Landlord',
      phone: '+123****7890', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Landlord' } } }] },
    },
    update: { passwordHash: await hash('Landlord123!') },
  });

  const tenant = await prisma.user.upsert({
    where: { email: 'tenant@prms.com' },
    create: {
      email: 'tenant@prms.com', passwordHash: await hash('Tenant123!'),
      firebase_uid: 'tenant-001', full_name: 'Jane Tenant',
      phone: '+198****4321', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Tenant' } } }] },
    },
    update: { passwordHash: await hash('Tenant123!') },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@prms.com' },
    create: {
      email: 'agent@prms.com', passwordHash: await hash('Agent123!'),
      firebase_uid: 'agent-001', full_name: 'Sam Agent',
      phone: '+199****5678', is_active: true,
      UserRole: { create: [{ role: { connect: { name: 'Agent' } } }] },
    },
    update: { passwordHash: await hash('Agent123!') },
  });

  console.log('Seeding Malaysian property categories and 60 properties...');
  const categoryDefinitions = [
    ['Terrace', 'Landed terrace homes'], ['Double Storey', 'Two-storey family homes'],
    ['Apartment', 'Practical apartment residences'], ['Condominium', 'Managed residences with facilities'],
    ['Semi-D', 'Semi-detached landed homes'], ['Bungalow', 'Detached premium residences'],
  ] as const;
  const locations = [
    ['Bangsar', 'Kuala Lumpur', 3.1291, 101.6788], ['Petaling Jaya', 'Selangor', 3.1073, 101.6067],
    ['Shah Alam', 'Selangor', 3.0733, 101.5185], ['Subang Jaya', 'Selangor', 3.0567, 101.5851],
    ['Cyberjaya', 'Selangor', 2.9213, 101.6559], ['Putrajaya', 'Putrajaya', 2.9264, 101.6964],
    ['Johor Bahru', 'Johor', 1.4927, 103.7414], ['George Town', 'Penang', 5.4141, 100.3288],
    ['Ipoh', 'Perak', 4.5975, 101.0901], ['Kota Kinabalu', 'Sabah', 5.9804, 116.0735],
  ] as const;
  const seededProperties = [];
  for (let categoryIndex = 0; categoryIndex < categoryDefinitions.length; categoryIndex++) {
    const [name, description] = categoryDefinitions[categoryIndex];
    const category = await prisma.propertyCategory.upsert({ where: { name }, create: { name, description, isShared: true }, update: { description, isDisabled: false } });
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex++) {
      const [city, state, latitude, longitude] = locations[locationIndex];
      const number = categoryIndex * locations.length + locationIndex + 1;
      const id = `my-property-${String(number).padStart(3, '0')}`;
      const data = {
        title: `${name} residence in ${city}`, address: `${12 + number}, Jalan Harmoni ${locationIndex + 1}, ${city}`,
        property_type: name.toLowerCase().replace(/ /g, '-'), description: `A well-maintained ${name.toLowerCase()} home near public transport, schools and daily amenities.`,
        rent: 1200 + categoryIndex * 650 + locationIndex * 90, city, state, latitude: latitude + categoryIndex * 0.001,
        longitude: longitude + categoryIndex * 0.001, ownerId: landlord.id, categoryId: category.id, status: 'AVAILABLE' as const,
      };
      seededProperties.push(await prisma.property.upsert({ where: { id }, create: { id, ...data }, update: data }));
    }
  }
  const [prop1, prop2] = seededProperties;

  console.log('Seeding amenities...');
  await prisma.amenity.deleteMany();
  await prisma.amenity.createMany({
    data: [
      { name: 'WiFi', description: 'High-speed WiFi', propertyId: prop1.id },
      { name: 'Parking', description: 'Free parking', propertyId: prop1.id },
      { name: 'Laundry', description: 'In-unit laundry', propertyId: prop2.id },
    ],
  });

  console.log('Seeding system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'app_name' },
    create: { key: 'app_name', value: 'PRMS', category: 'general', description: 'App name' },
    update: {},
  });
  await prisma.systemSetting.upsert({
    where: { key: 'currency' },
    create: { key: 'currency', value: 'MYR', category: 'general', description: 'Default currency' },
    update: { value: 'MYR' },
  });

  console.log('Seeding agent records...');
  const agentRecord = await prisma.agent.upsert({
    where: { userId: agent.id },
    create: { userId: agent.id },
    update: {},
  });

  console.log('Seeding agent-property assignments...');
  await prisma.agentProperty.upsert({
    where: { agentId_propertyId: { agentId: agentRecord.id, propertyId: prop1.id } },
    create: { agentId: agentRecord.id, propertyId: prop1.id },
    update: {},
  });
  await prisma.agentProperty.upsert({
    where: { agentId_propertyId: { agentId: agentRecord.id, propertyId: prop2.id } },
    create: { agentId: agentRecord.id, propertyId: prop2.id },
    update: {},
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
