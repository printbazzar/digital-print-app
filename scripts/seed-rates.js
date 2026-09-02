const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Synchronizing official machine click billing tariffs...');
  let machine = await prisma.machine.findFirst();
  if (!machine) {
    machine = await prisma.machine.create({
      data: {
        id: 'mach-c3070-001',
        name: 'Konica Minolta C3070',
        model: 'AccurioPress C3070',
      },
    });
  }

  const ratesToUpsert = [
    {
      paperSize: 'A4',
      printType: 'COLOUR',
      rate: 2.90,
      tier2Rate: 2.90,
      tierThreshold: null,
      gstPercent: 18.0,
    },
    {
      paperSize: 'A4',
      printType: 'BW',
      rate: 1.10,
      tier2Rate: 1.10,
      tierThreshold: null,
      gstPercent: 18.0,
    },
    {
      paperSize: 'A3',
      printType: 'COLOUR',
      rate: 4.25,
      tier2Rate: 4.15,
      tierThreshold: 10000,
      gstPercent: 18.0,
    },
    {
      paperSize: 'A3',
      printType: 'BW',
      rate: 1.10,
      tier2Rate: 1.10,
      tierThreshold: null,
      gstPercent: 18.0,
    },
    {
      paperSize: 'BANNER',
      printType: 'COLOUR',
      rate: 6.40,
      tier2Rate: 6.40,
      tierThreshold: null,
      gstPercent: 18.0,
    },
    {
      paperSize: 'BANNER',
      printType: 'BW',
      rate: 2.20,
      tier2Rate: 2.20,
      tierThreshold: null,
      gstPercent: 18.0,
    },
  ];

  for (const r of ratesToUpsert) {
    const existing = await prisma.printRate.findFirst({
      where: {
        machineId: machine.id,
        paperSize: r.paperSize,
        printType: r.printType,
      },
    });

    if (existing) {
      await prisma.printRate.update({
        where: { id: existing.id },
        data: {
          rate: r.rate,
          tier2Rate: r.tier2Rate,
          tierThreshold: r.tierThreshold,
          gstPercent: r.gstPercent,
          isActive: true,
        },
      });
      console.log(`Updated rate: ${r.paperSize} ${r.printType} -> ₹${r.rate} (Tier 2: ₹${r.tier2Rate || r.rate})`);
    } else {
      await prisma.printRate.create({
        data: {
          machineId: machine.id,
          paperSize: r.paperSize,
          printType: r.printType,
          rate: r.rate,
          tier2Rate: r.tier2Rate,
          tierThreshold: r.tierThreshold,
          gstPercent: r.gstPercent,
          isActive: true,
        },
      });
      console.log(`Created rate: ${r.paperSize} ${r.printType} -> ₹${r.rate}`);
    }
  }

  const allRates = await prisma.printRate.findMany();
  console.log('\n📊 CURRENT ACTIVE TARIFFS IN DATABASE:');
  console.table(allRates.map(r => ({
    size: r.paperSize,
    type: r.printType,
    rate: Number(r.rate),
    tier2Rate: Number(r.tier2Rate),
    threshold: r.tierThreshold,
    gst: Number(r.gstPercent) + '%',
  })));

  await prisma.$disconnect();
}

main();
