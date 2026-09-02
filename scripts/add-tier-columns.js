const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "print_rates" ADD COLUMN IF NOT EXISTS "tier2Rate" DECIMAL(10, 2) DEFAULT 4.15;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "print_rates" ADD COLUMN IF NOT EXISTS "tierThreshold" INTEGER DEFAULT 10000;
    `);
    console.log('✅ Added tier2Rate and tierThreshold columns to print_rates table.');
  } catch (err) {
    console.error('Error adding columns to print_rates:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
