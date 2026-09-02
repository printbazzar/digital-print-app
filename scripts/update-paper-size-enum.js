const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$executeRawUnsafe(`ALTER TYPE "PaperSize" ADD VALUE IF NOT EXISTS 'BANNER';`);
    console.log('✅ Added BANNER to PaperSize enum in PostgreSQL.');
  } catch (err) {
    console.error('Error adding BANNER to PaperSize:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
