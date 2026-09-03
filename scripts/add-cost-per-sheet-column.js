const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Adding costPerSheet column to media table...');
    await prisma.$queryRawUnsafe(`
      ALTER TABLE "media" 
      ADD COLUMN IF NOT EXISTS "costPerSheet" DECIMAL(10, 2) DEFAULT 0.00;
    `);
    console.log('✅ Column costPerSheet added successfully!');

    // Populate initial realistic paper cost per sheet for existing media
    // Maplitho: ~1.50 - 2.00, Art Paper: ~2.50 - 3.80, Art Board: ~4.50 - 6.50, Stickers: ~8.00 - 15.00, Textures: ~12.00 - 18.00
    const mediaItems = await prisma.media.findMany();
    console.log(`Found ${mediaItems.length} media items. Setting benchmark costs...`);

    for (const m of mediaItems) {
      let cost = 3.50; // default benchmark
      const name = m.name.toLowerCase();
      const gsm = m.gsm;

      if (name.includes('maplitho') || name.includes('bond')) {
        cost = gsm <= 80 ? 1.60 : 2.00;
      } else if (name.includes('art paper')) {
        if (gsm <= 100) cost = 2.40;
        else if (gsm <= 130) cost = 2.80;
        else cost = 3.50;
      } else if (name.includes('art board')) {
        if (gsm <= 250) cost = 4.20;
        else if (gsm <= 300) cost = 4.80;
        else cost = 5.80;
      } else if (name.includes('metallic') || name.includes('gold') || name.includes('silver')) {
        cost = 14.50;
      } else if (name.includes('sticker') || name.includes('pvc') || name.includes('clear')) {
        cost = 8.50;
      } else if (name.includes('texture') || name.includes('linen') || name.includes('needle')) {
        cost = 12.00;
      } else if (name.includes('synthetic')) {
        cost = gsm <= 125 ? 9.50 : 13.50;
      }

      await prisma.$queryRawUnsafe(`
        UPDATE "media" 
        SET "costPerSheet" = $1 
        WHERE "id" = $2;
      `, cost, m.id);
    }

    console.log('✅ Benchmark costPerSheet values populated for all media items!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
