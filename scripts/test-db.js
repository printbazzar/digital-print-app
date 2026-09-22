const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || '';
      val = val.trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Successfully connected to DB! Users:', users.length);
    const jobs = await prisma.jobProduction.findMany();
    console.log('Total jobs in DB:', jobs.length);
    const counters = await prisma.dailyMachineCounter.findMany();
    console.log('Total daily counters in DB:', counters.length);
  } catch (err) {
    console.log('DB error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
