// Seed directly into Supabase PostgreSQL database using Prisma Client
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const INITIAL_MACHINE = {
  id: 'mach-c3070-001',
  name: 'Konica Minolta C3070',
  model: 'AccurioPress C3070',
  department: 'Digital Printing Production',
  initialCounter: 1067426,
  currentCounter: 1067426,
  isActive: true,
};

const INITIAL_RATES = [
  { id: 'rate-a4-colour', machineId: 'mach-c3070-001', paperSize: 'A4', printType: 'COLOUR', rate: 2.90, gstPercent: 18.0, isActive: true },
  { id: 'rate-a4-bw', machineId: 'mach-c3070-001', paperSize: 'A4', printType: 'BW', rate: 1.10, gstPercent: 18.0, isActive: true },
  { id: 'rate-a3-colour', machineId: 'mach-c3070-001', paperSize: 'A3', printType: 'COLOUR', rate: 4.25, gstPercent: 18.0, isActive: true },
  { id: 'rate-a3-bw', machineId: 'mach-c3070-001', paperSize: 'A3', printType: 'BW', rate: 1.10, gstPercent: 18.0, isActive: true },
];

const INITIAL_WASTAGE_REASONS = [
  { id: 'wr-1', reason: 'Machine Error', isActive: true },
  { id: 'wr-2', reason: 'Paper Jam', isActive: true },
  { id: 'wr-3', reason: 'Print Quality Issue', isActive: true },
  { id: 'wr-4', reason: 'Colour Issue', isActive: true },
  { id: 'wr-5', reason: 'Registration Issue', isActive: true },
  { id: 'wr-6', reason: 'Operator Error', isActive: true },
  { id: 'wr-7', reason: 'Test Print', isActive: true },
  { id: 'wr-8', reason: 'Damaged Media', isActive: true },
  { id: 'wr-9', reason: 'Customer Change', isActive: true },
  { id: 'wr-10', reason: 'Other', isActive: true },
];

const INITIAL_MEDIA = [
  { id: 'med-1', name: 'Maplitho', gsm: 80, size: '13x19', brand: 'Century', currentStock: 2500, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-2', name: 'Maplitho', gsm: 100, size: '13x19', brand: 'Century', currentStock: 2000, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-3', name: 'Bond Sheet', gsm: 80, size: '13x19', brand: 'Bilt', currentStock: 1800, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-4', name: 'Bond Sheet', gsm: 100, size: '13x19', brand: 'Bilt', currentStock: 1500, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-5', name: 'Art Paper', gsm: 100, size: '13x19', brand: 'Century', currentStock: 3000, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-6', name: 'Art Paper', gsm: 130, size: '13x19', brand: 'Century', currentStock: 2800, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-7', name: 'Art Paper', gsm: 170, size: '13x19', brand: 'Century', currentStock: 2500, minimumStockLevel: 500, unit: 'sheets', isActive: true },
  { id: 'med-8', name: 'Art Board', gsm: 250, size: '13x19', brand: 'ITC Cyber XL', currentStock: 1200, minimumStockLevel: 300, unit: 'sheets', isActive: true },
  { id: 'med-9', name: 'Art Board', gsm: 300, size: '13x19', brand: 'ITC Cyber XL', currentStock: 1500, minimumStockLevel: 300, unit: 'sheets', isActive: true },
  { id: 'med-10', name: 'Art Board', gsm: 350, size: '13x19', brand: 'ITC Cyber XL', currentStock: 800, minimumStockLevel: 200, unit: 'sheets', isActive: true },
  { id: 'med-11', name: 'Synthetic Sheet', gsm: 125, size: '13x19', brand: 'Generic', currentStock: 600, minimumStockLevel: 200, unit: 'sheets', isActive: true },
  { id: 'med-12', name: 'Synthetic Sheet', gsm: 200, size: '13x19', brand: 'Generic', currentStock: 500, minimumStockLevel: 200, unit: 'sheets', isActive: true },
  { id: 'med-13', name: 'Gold Metallic Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 350, minimumStockLevel: 100, unit: 'sheets', isActive: true },
  { id: 'med-14', name: 'Art Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 900, minimumStockLevel: 200, unit: 'sheets', isActive: true },
  { id: 'med-15', name: 'PVC White Sticker', gsm: 180, size: '13x19', brand: 'Generic', currentStock: 450, minimumStockLevel: 150, unit: 'sheets', isActive: true },
  { id: 'med-16', name: 'Transparent Clear Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 400, minimumStockLevel: 150, unit: 'sheets', isActive: true },
  { id: 'med-17', name: 'Linen White Texture', gsm: 280, size: '13x19', brand: 'Fedrigoni', currentStock: 250, minimumStockLevel: 100, unit: 'sheets', isActive: true },
  { id: 'med-18', name: 'Needle Point Texture', gsm: 280, size: '13x19', brand: 'Fedrigoni', currentStock: 200, minimumStockLevel: 100, unit: 'sheets', isActive: true },
  { id: 'med-19', name: 'Silver Metallic Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 300, minimumStockLevel: 100, unit: 'sheets', isActive: true },
  { id: 'med-20', name: 'Metallic Board Silver', gsm: 300, size: '13x19', brand: 'Generic', currentStock: 220, minimumStockLevel: 100, unit: 'sheets', isActive: true },
  { id: 'med-21', name: 'Metallic Board Gold', gsm: 300, size: '13x19', brand: 'Generic', currentStock: 240, minimumStockLevel: 100, unit: 'sheets', isActive: true },
];

async function seedSupabase() {
  console.log('🚀 Seeding Supabase database...');

  // 1. Seed Users
  const ownerPass = await bcrypt.hash('owner123', 10);
  const operatorPass = await bcrypt.hash('operator123', 10);

  await prisma.user.upsert({
    where: { email: 'owner@printbazzar.com' },
    update: {},
    create: {
      id: 'usr-owner-001',
      email: 'owner@printbazzar.com',
      name: 'Owner (Print Bazzar)',
      passwordHash: ownerPass,
      role: 'OWNER',
    },
  });

  await prisma.user.upsert({
    where: { email: 'operator@printbazzar.com' },
    update: {},
    create: {
      id: 'usr-operator-001',
      email: 'operator@printbazzar.com',
      name: 'Operator 1 (Konica C3070)',
      passwordHash: operatorPass,
      role: 'OPERATOR',
    },
  });
  console.log('✔ Users seeded (Owner & Operator)');

  // 2. Seed Machine
  await prisma.machine.upsert({
    where: { name: INITIAL_MACHINE.name },
    update: {},
    create: INITIAL_MACHINE,
  });
  console.log('✔ Machine seeded (Konica Minolta C3070 - Initial: 1,067,426)');

  // 3. Seed Rates
  for (const r of INITIAL_RATES) {
    await prisma.printRate.upsert({
      where: {
        machineId_paperSize_printType: {
          machineId: r.machineId,
          paperSize: r.paperSize,
          printType: r.printType,
        },
      },
      update: {},
      create: r,
    });
  }
  console.log('✔ Print Rates seeded (A4/A3 Colour & B&W)');

  // 4. Seed Wastage Reasons
  for (const wr of INITIAL_WASTAGE_REASONS) {
    await prisma.wastageReason.upsert({
      where: { reason: wr.reason },
      update: {},
      create: wr,
    });
  }
  console.log('✔ Wastage Reasons seeded');

  // 5. Seed Media
  for (const m of INITIAL_MEDIA) {
    const existing = await prisma.media.findFirst({
      where: { name: m.name, gsm: m.gsm, size: m.size, brand: m.brand },
    });
    if (!existing) {
      await prisma.media.create({ data: m });
    }
  }
  console.log('✔ 21 Media & Paper stocks seeded into Supabase');

  console.log('🎉 Supabase database seeding complete!');
  await prisma.$disconnect();
}

seedSupabase().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
