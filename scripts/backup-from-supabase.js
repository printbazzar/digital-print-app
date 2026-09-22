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
const prisma = new PrismaClient();
const DB_JSON_PATH = path.join(process.cwd(), 'data', 'db.json');

async function backup() {
  console.log('Connecting to Supabase PostgreSQL...');
  try {
    const [users, machines, rates, media, jobs, dailyCounters, wastageReasons, auditLogs] = await Promise.all([
      prisma.user.findMany(),
      prisma.machine.findMany(),
      prisma.printRate.findMany(),
      prisma.media.findMany({ orderBy: [{ name: 'asc' }, { gsm: 'asc' }] }),
      prisma.jobProduction.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.dailyMachineCounter.findMany({ orderBy: { date: 'desc' } }),
      prisma.wastageReason.findMany(),
      prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 200 }),
    ]);

    console.log('Fetched from Supabase:', jobs.length, 'jobs,', media.length, 'media items,', dailyCounters.length, 'counters.');

    const data = {
      users,
      machines,
      rates,
      media,
      jobs,
      dailyCounters,
      wastageReasons,
      auditLogs,
      lastBackupAt: new Date().toISOString(),
    };

    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully backed up all Supabase data into data/db.json!');
  } catch (err) {
    console.error('Backup failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

backup();
