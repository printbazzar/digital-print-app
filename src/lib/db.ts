// Print Bazzar - Production Database Layer backed by Supabase PostgreSQL (Prisma ORM)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  calculateJobProduction,
  reconcileMachineCounter,
  resolvePrintRate,
  PrintSide,
  PaperSize,
  PrintType,
} from './calculations';
import {
  INITIAL_MACHINE,
  INITIAL_RATES,
  INITIAL_WASTAGE_REASONS,
  INITIAL_MEDIA,
} from './seed-data';
import { findBuiltInUser, BUILT_IN_USERS } from './auth';

import fs from 'fs';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const DB_JSON_PATH = path.join(process.cwd(), 'data', 'db.json');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');
let memoryDb: any = null;

// Determine if running purely on local machine without external cloud dependencies
export const IS_LOCAL_SERVER =
  process.env.STORAGE_MODE === 'local' ||
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('gpyzegwmfzacrrwsgzdk');

export function readDbJson(): any {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const content = fs.readFileSync(DB_JSON_PATH, 'utf8');
      memoryDb = JSON.parse(content);
      return memoryDb;
    }
  } catch (err) {
    console.warn('Failed to read db.json:', err);
  }
  return {
    users: BUILT_IN_USERS,
    machines: [INITIAL_MACHINE],
    rates: INITIAL_RATES,
    media: INITIAL_MEDIA,
    jobs: [],
    dailyCounters: [],
    wastageReasons: INITIAL_WASTAGE_REASONS,
    notifications: [],
    auditLogs: [],
  };
}

export function writeDbJson(data: any): void {
  memoryDb = data;
  try {
    const dir = path.dirname(DB_JSON_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. Atomic write: write to temp file then rename
    const tmpFile = path.join(dir, `db-${Date.now()}.tmp`);
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_JSON_PATH);

    // 2. Automated daily backup rotation (never lose entries)
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const today = new Date().toISOString().split('T')[0];
    const dailyBackupFile = path.join(BACKUPS_DIR, `db-${today}.json`);
    fs.copyFileSync(DB_JSON_PATH, dailyBackupFile);
  } catch (err) {
    console.warn('Could not write to db.json (persisting in memory):', err);
  }
}

export const db = {
  // --- USERS ---
  users: {
    findByEmail: async (email: string) => {
      const clean = (email || '').toLowerCase().trim();
      const builtIn = findBuiltInUser(clean);

      try {
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: clean },
              ...(builtIn ? [{ email: builtIn.email }] : []),
            ],
          },
        });

        if (!user && builtIn) {
          try {
            user = await prisma.user.create({
              data: {
                id: builtIn.id,
                email: builtIn.email,
                name: builtIn.name,
                passwordHash: builtIn.passwordHash,
                role: builtIn.role,
                isActive: true,
              },
            });
          } catch {
            // DB write failed (e.g. offline/paused)
          }
        }

        if (user) {
          return {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn('Database query error in findByEmail, using builtIn fallback:', err);
      }

      if (builtIn) {
        return {
          id: builtIn.id,
          email: builtIn.email,
          name: builtIn.name,
          passwordHash: builtIn.passwordHash,
          role: builtIn.role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return undefined;
    },
    findById: async (id: string) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (user) {
          return {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        console.warn('Database query error in findById, checking builtIn fallback:', err);
      }

      const builtIn = BUILT_IN_USERS.find((u) => u.id === id);
      if (builtIn) {
        return {
          id: builtIn.id,
          email: builtIn.email,
          name: builtIn.name,
          passwordHash: builtIn.passwordHash,
          role: builtIn.role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return undefined;
    },
    list: async () => {
      try {
        const list = await prisma.user.findMany({
          include: {
            _count: {
              select: { jobs: true },
            },
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
        });
        if (list.length > 0) {
          return list.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            isActive: u.isActive,
            jobsCount: u._count.jobs,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
          }));
        }
      } catch (err) {
        console.warn('Database query error in list users, using builtIn fallback:', err);
      }

      return BUILT_IN_USERS.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        jobsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    },
    create: async (data: { email: string; name: string; password: string; role?: 'OWNER' | 'OPERATOR' }) => {
      const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new Error(`A user with email '${data.email}' already exists.`);
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          name: data.name.trim(),
          passwordHash,
          role: data.role || 'OPERATOR',
          isActive: true,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    },
    update: async (id: string, updates: { name?: string; email?: string; role?: 'OWNER' | 'OPERATOR'; password?: string; isActive?: boolean }) => {
      const dataToUpdate: any = {};
      if (updates.name) dataToUpdate.name = updates.name.trim();
      if (updates.email) dataToUpdate.email = updates.email.toLowerCase().trim();
      if (updates.role) dataToUpdate.role = updates.role;
      if (updates.isActive !== undefined) dataToUpdate.isActive = updates.isActive;
      if (updates.password) {
        dataToUpdate.passwordHash = await bcrypt.hash(updates.password, 10);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });

      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
    delete: async (id: string) => {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new Error('User not found');
      if (user.email === 'owner@printbazzar.com') {
        throw new Error('Primary Owner account cannot be deleted.');
      }

      // If user has jobs, deactivate instead of hard delete to preserve foreign keys
      const jobsCount = await prisma.jobProduction.count({ where: { operatorId: id } });
      if (jobsCount > 0) {
        const updated = await prisma.user.update({
          where: { id },
          data: { isActive: false },
        });
        return { success: true, message: `User '${user.name}' deactivated to preserve past job audit history.`, user: updated };
      }

      await prisma.user.delete({ where: { id } });
      return { success: true, message: `User '${user.name}' deleted successfully.` };
    },
  },

  // --- MACHINES ---
  machines: {
    getKonica: async () => {
      try {
        let mach = await prisma.machine.findFirst({
          where: { name: { contains: 'Konica' } },
        });
        if (!mach) {
          mach = await prisma.machine.create({
            data: {
              ...INITIAL_MACHINE,
            },
          });
        }
        return {
          ...mach,
          createdAt: mach.createdAt.toISOString(),
          updatedAt: mach.updatedAt.toISOString(),
        };
      } catch (err) {
        console.error('getKonica error, falling back to db.json:', err);
        const local = readDbJson();
        const m = (local.machines && local.machines.length > 0) ? local.machines[0] : INITIAL_MACHINE;
        return {
          ...m,
          createdAt: m.createdAt || new Date().toISOString(),
          updatedAt: m.updatedAt || new Date().toISOString(),
        };
      }
    },
    list: async () => {
      try {
        let list = await prisma.machine.findMany();
        if (list.length === 0) {
          await db.machines.getKonica();
          list = await prisma.machine.findMany();
        }
        return list.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }));
      } catch {
        const local = readDbJson();
        const machs = local.machines && local.machines.length > 0 ? local.machines : [INITIAL_MACHINE];
        return machs.map((m: any) => ({
          ...m,
          createdAt: m.createdAt || new Date().toISOString(),
          updatedAt: m.updatedAt || new Date().toISOString(),
        }));
      }
    },
    update: async (id: string, updates: any) => {
      try {
        const updated = await prisma.machine.update({
          where: { id },
          data: updates,
        });
        return {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch {
        const local = readDbJson();
        const m = (local.machines || []).find((x: any) => x.id === id);
        if (m) {
          Object.assign(m, updates, { updatedAt: new Date().toISOString() });
          writeDbJson(local);
          return m;
        }
        return null;
      }
    },
  },

  // --- PRINT RATES ---
  rates: {
    list: async (machineId?: string) => {
      try {
        let list = await prisma.printRate.findMany({
          where: machineId ? { machineId } : undefined,
        });
        if (list.length === 0) {
          const mach = await db.machines.getKonica();
          for (const r of INITIAL_RATES) {
            await prisma.printRate.create({
              data: {
                id: r.id,
                paperSize: r.paperSize as PaperSize,
                printType: r.printType as PrintType,
                rate: r.rate,
                gstPercent: r.gstPercent,
                isActive: r.isActive,
                machineId: mach.id,
              },
            });
          }
          list = await prisma.printRate.findMany();
        }
        return list.map((r) => ({
          ...r,
          rate: Number(r.rate),
          tier2Rate: r.tier2Rate !== null && r.tier2Rate !== undefined ? Number(r.tier2Rate) : Number(r.rate),
          tierThreshold: r.tierThreshold,
          gstPercent: Number(r.gstPercent),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch {
        const local = readDbJson();
        const rList = local.rates && local.rates.length > 0 ? local.rates : INITIAL_RATES;
        return rList.map((r: any) => ({
          ...r,
          rate: Number(r.rate),
          tier2Rate: r.tier2Rate ? Number(r.tier2Rate) : Number(r.rate),
          tierThreshold: r.tierThreshold,
          gstPercent: Number(r.gstPercent || 18),
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        }));
      }
    },
    find: async (machineId: string, paperSize: PaperSize, printType: PrintType) => {
      try {
        const r = await prisma.printRate.findUnique({
          where: {
            machineId_paperSize_printType: {
              machineId,
              paperSize,
              printType,
            },
          },
        });
        return r ? {
          ...r,
          rate: Number(r.rate),
          tier2Rate: r.tier2Rate !== null && r.tier2Rate !== undefined ? Number(r.tier2Rate) : Number(r.rate),
          tierThreshold: r.tierThreshold,
          gstPercent: Number(r.gstPercent),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        } : undefined;
      } catch {
        const local = readDbJson();
        const r = (local.rates || INITIAL_RATES).find(
          (item: any) => item.paperSize === paperSize && item.printType === printType
        );
        return r ? {
          ...r,
          rate: Number(r.rate),
          tier2Rate: r.tier2Rate !== null && r.tier2Rate !== undefined ? Number(r.tier2Rate) : Number(r.rate),
          tierThreshold: r.tierThreshold,
          gstPercent: Number(r.gstPercent || 18),
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
        } : undefined;
      }
    },
    update: async (id: string, rate: number, gstPercent?: number, tier2Rate?: number, tierThreshold?: number) => {
      try {
        const updated = await prisma.printRate.update({
          where: { id },
          data: {
            rate,
            tier2Rate: tier2Rate !== undefined ? tier2Rate : undefined,
            tierThreshold: tierThreshold !== undefined ? tierThreshold : undefined,
            gstPercent: gstPercent !== undefined ? gstPercent : undefined,
          },
        });
        return {
          ...updated,
          rate: Number(updated.rate),
          tier2Rate: updated.tier2Rate !== null && updated.tier2Rate !== undefined ? Number(updated.tier2Rate) : Number(updated.rate),
          tierThreshold: updated.tierThreshold,
          gstPercent: Number(updated.gstPercent),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch {
        const local = readDbJson();
        const r = (local.rates || []).find((x: any) => x.id === id);
        if (r) {
          if (rate !== undefined) r.rate = Number(rate);
          if (tier2Rate !== undefined) r.tier2Rate = Number(tier2Rate);
          if (tierThreshold !== undefined) r.tierThreshold = Number(tierThreshold);
          if (gstPercent !== undefined) r.gstPercent = Number(gstPercent);
          r.updatedAt = new Date().toISOString();
          writeDbJson(local);
          return {
            ...r,
            rate: Number(r.rate),
            tier2Rate: r.tier2Rate !== null && r.tier2Rate !== undefined ? Number(r.tier2Rate) : Number(r.rate),
            tierThreshold: r.tierThreshold,
            gstPercent: Number(r.gstPercent || 18),
            createdAt: r.createdAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
          };
        }
        return null;
      }
    },
  },

  // --- MEDIA & INVENTORY ---
  media: {
    list: async () => {
      try {
        let list = await prisma.media.findMany({
          orderBy: [{ name: 'asc' }, { gsm: 'asc' }],
        });
        if (list.length === 0) {
          for (const m of INITIAL_MEDIA) {
            await prisma.media.create({ data: m });
          }
          list = await prisma.media.findMany({
            orderBy: [{ name: 'asc' }, { gsm: 'asc' }],
          });
        }
        return list.map((m) => ({
          ...m,
          brand: m.brand || 'Generic',
          costPerSheet: Number(m.costPerSheet !== null && m.costPerSheet !== undefined ? m.costPerSheet : 0),
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }));
      } catch {
        const local = readDbJson();
        const mList = local.media && local.media.length > 0 ? local.media : INITIAL_MEDIA;
        return mList.map((m: any) => ({
          ...m,
          brand: m.brand || 'Generic',
          costPerSheet: Number(m.costPerSheet || 0),
          currentStock: Number(m.currentStock || 0),
          minimumStockLevel: Number(m.minimumStockLevel || 100),
          createdAt: m.createdAt || new Date().toISOString(),
          updatedAt: m.updatedAt || new Date().toISOString(),
        }));
      }
    },
    getById: async (id: string) => {
      try {
        const m = await prisma.media.findUnique({ where: { id } });
        if (m) {
          return {
            ...m,
            brand: m.brand || 'Generic',
            costPerSheet: Number(m.costPerSheet !== null && m.costPerSheet !== undefined ? m.costPerSheet : 0),
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          };
        }
      } catch {
        // Fall back to db.json
      }
      const local = readDbJson();
      const m = (local.media || INITIAL_MEDIA).find((x: any) => x.id === id);
      return m ? {
        ...m,
        brand: m.brand || 'Generic',
        costPerSheet: Number(m.costPerSheet || 0),
        currentStock: Number(m.currentStock || 0),
        minimumStockLevel: Number(m.minimumStockLevel || 100),
        createdAt: m.createdAt || new Date().toISOString(),
        updatedAt: m.updatedAt || new Date().toISOString(),
      } : undefined;
    },
    create: async (item: any) => {
      try {
        const created = await prisma.media.create({
          data: {
            name: item.name.trim(),
            gsm: Number(item.gsm),
            size: item.size.trim(),
            brand: item.brand?.trim() || 'Generic',
            costPerSheet: Math.max(0, Number(item.costPerSheet) || 0),
            currentStock: Math.max(0, Number(item.currentStock) || 0),
            minimumStockLevel: Math.max(0, Number(item.minimumStockLevel) || 100),
            unit: item.unit || 'sheets',
            isActive: item.isActive !== undefined ? item.isActive : true,
          },
        });
        return {
          ...created,
          brand: created.brand || 'Generic',
          costPerSheet: Number(created.costPerSheet || 0),
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      } catch {
        const local = readDbJson();
        const newMedia = {
          id: `med-${Date.now()}`,
          name: item.name.trim(),
          gsm: Number(item.gsm),
          size: item.size.trim(),
          brand: item.brand?.trim() || 'Generic',
          costPerSheet: Math.max(0, Number(item.costPerSheet) || 0),
          currentStock: Math.max(0, Number(item.currentStock) || 0),
          minimumStockLevel: Math.max(0, Number(item.minimumStockLevel) || 100),
          unit: item.unit || 'sheets',
          isActive: item.isActive !== undefined ? item.isActive : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (!local.media) local.media = [];
        local.media.push(newMedia);
        writeDbJson(local);
        return newMedia;
      }
    },
    update: async (id: string, updates: any) => {
      try {
        const dataToUpdate: any = {};
        if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
        if (updates.gsm !== undefined) dataToUpdate.gsm = Number(updates.gsm);
        if (updates.size !== undefined) dataToUpdate.size = updates.size.trim();
        if (updates.brand !== undefined) dataToUpdate.brand = updates.brand.trim() || 'Generic';
        if (updates.costPerSheet !== undefined) dataToUpdate.costPerSheet = Math.max(0, Number(updates.costPerSheet));
        if (updates.minimumStockLevel !== undefined) dataToUpdate.minimumStockLevel = Math.max(0, Number(updates.minimumStockLevel));
        if (updates.currentStock !== undefined) dataToUpdate.currentStock = Math.max(0, Number(updates.currentStock));
        if (updates.isActive !== undefined) dataToUpdate.isActive = Boolean(updates.isActive);

        const updated = await prisma.media.update({
          where: { id },
          data: dataToUpdate,
        });
        return {
          ...updated,
          brand: updated.brand || 'Generic',
          costPerSheet: Number(updated.costPerSheet || 0),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('Media update fallback to db.json:', err);
        const local = readDbJson();
        const m = (local.media || []).find((x: any) => x.id === id);
        if (m) {
          if (updates.name !== undefined) m.name = updates.name.trim();
          if (updates.gsm !== undefined) m.gsm = Number(updates.gsm);
          if (updates.size !== undefined) m.size = updates.size.trim();
          if (updates.brand !== undefined) m.brand = updates.brand.trim() || 'Generic';
          if (updates.costPerSheet !== undefined) m.costPerSheet = Math.max(0, Number(updates.costPerSheet));
          if (updates.minimumStockLevel !== undefined) m.minimumStockLevel = Math.max(0, Number(updates.minimumStockLevel));
          if (updates.currentStock !== undefined) m.currentStock = Math.max(0, Number(updates.currentStock));
          if (updates.isActive !== undefined) m.isActive = Boolean(updates.isActive);
          m.updatedAt = new Date().toISOString();
          writeDbJson(local);
          return m;
        }
        return null;
      }
    },
  },

  // --- INVENTORY MOVEMENTS ---
  inventory: {
    restock: async (mediaId: string, quantity: number, userId: string, reason?: string, costPerSheet?: number) => {
      try {
        const media = await prisma.media.findUnique({ where: { id: mediaId } });
        if (media) {
          let validUserId = userId;
          const userExists = await prisma.user.findUnique({ where: { id: userId } });
          if (!userExists) {
            const firstUser = await prisma.user.findFirst();
            if (firstUser) validUserId = firstUser.id;
          }

          const qty = Math.max(1, Math.floor(quantity));
          const openingStock = media.currentStock;
          const closingStock = openingStock + qty;

          const mediaUpdateData: any = { currentStock: closingStock };
          if (costPerSheet !== undefined && Number(costPerSheet) >= 0) {
            mediaUpdateData.costPerSheet = Number(costPerSheet);
          }

          const [updatedMedia, movement] = await prisma.$transaction([
            prisma.media.update({
              where: { id: mediaId },
              data: mediaUpdateData,
            }),
            prisma.inventoryMovement.create({
              data: {
                mediaId,
                quantity: qty,
                openingStock,
                closingStock,
                movementType: 'STOCK_IN',
                reason: reason || 'Restock purchase',
                userId: validUserId,
              },
            }),
            prisma.auditLog.create({
              data: {
                userId: validUserId,
                action: 'STOCK_RESTOCKED',
                entity: 'Media',
                entityId: mediaId,
                newValue: {
                  media: `${media.gsm} GSM ${media.name}`,
                  quantityAdded: qty,
                  newStock: closingStock,
                  reason: reason || 'Restock purchase',
                },
              },
            }),
          ]);

          return {
            media: {
              ...updatedMedia,
              brand: updatedMedia.brand || 'Generic',
              createdAt: updatedMedia.createdAt.toISOString(),
              updatedAt: updatedMedia.updatedAt.toISOString(),
            },
            movement: {
              ...movement,
              mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
              userName: userExists?.name || 'Owner',
              createdAt: movement.createdAt.toISOString(),
            },
          };
        }
      } catch (err) {
        console.warn('restock fallback to db.json:', err);
      }

      const local = readDbJson();
      const media = (local.media || []).find((m: any) => m.id === mediaId);
      if (!media) throw new Error('Media not found');

      const qty = Math.max(1, Math.floor(quantity));
      const openingStock = media.currentStock || 0;
      const closingStock = openingStock + qty;
      media.currentStock = closingStock;
      if (costPerSheet !== undefined && Number(costPerSheet) >= 0) {
        media.costPerSheet = Number(costPerSheet);
      }
      media.updatedAt = new Date().toISOString();

      const movement = {
        id: `mov-${Date.now()}`,
        mediaId,
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        quantity: qty,
        openingStock,
        closingStock,
        movementType: 'STOCK_IN',
        reason: reason || 'Restock purchase',
        userName: 'Owner (Print Bazzar)',
        createdAt: new Date().toISOString(),
      };

      if (!local.inventoryMovements) local.inventoryMovements = [];
      local.inventoryMovements.unshift(movement);
      writeDbJson(local);

      return {
        media,
        movement,
      };
    },

    adjust: async (mediaId: string, newStock: number, userId: string, reason: string) => {
      try {
        const media = await prisma.media.findUnique({ where: { id: mediaId } });
        if (media) {
          let validUserId = userId;
          const userExists = await prisma.user.findUnique({ where: { id: userId } });
          if (!userExists) {
            const firstUser = await prisma.user.findFirst();
            if (firstUser) validUserId = firstUser.id;
          }

          const target = Math.max(0, Math.floor(newStock));
          const openingStock = media.currentStock;
          const quantityDiff = target - openingStock;

          const [updatedMedia, movement] = await prisma.$transaction([
            prisma.media.update({
              where: { id: mediaId },
              data: { currentStock: target },
            }),
            prisma.inventoryMovement.create({
              data: {
                mediaId,
                quantity: quantityDiff,
                openingStock,
                closingStock: target,
                movementType: 'STOCK_ADJUSTMENT',
                reason: reason || 'Manual Stock Adjustment',
                userId: validUserId,
              },
            }),
            prisma.auditLog.create({
              data: {
                userId: validUserId,
                action: 'STOCK_ADJUSTED',
                entity: 'Media',
                entityId: mediaId,
                newValue: {
                  media: `${media.gsm} GSM ${media.name}`,
                  previousStock: openingStock,
                  adjustedStock: target,
                  delta: quantityDiff,
                  reason: reason || 'Manual Stock Adjustment',
                },
              },
            }),
          ]);

          return {
            media: {
              ...updatedMedia,
              brand: updatedMedia.brand || 'Generic',
              createdAt: updatedMedia.createdAt.toISOString(),
              updatedAt: updatedMedia.updatedAt.toISOString(),
            },
            movement: {
              ...movement,
              mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
              userName: userExists?.name || 'Owner',
              createdAt: movement.createdAt.toISOString(),
            },
          };
        }
      } catch (err) {
        console.warn('adjust fallback to db.json:', err);
      }

      const local = readDbJson();
      const media = (local.media || []).find((m: any) => m.id === mediaId);
      if (!media) throw new Error('Media not found');

      const target = Math.max(0, Math.floor(newStock));
      const openingStock = media.currentStock || 0;
      const quantityDiff = target - openingStock;
      media.currentStock = target;
      media.updatedAt = new Date().toISOString();

      const movement = {
        id: `mov-${Date.now()}`,
        mediaId,
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        quantity: quantityDiff,
        openingStock,
        closingStock: target,
        movementType: 'STOCK_ADJUSTMENT',
        reason: reason || 'Manual Stock Adjustment',
        userName: 'Owner (Print Bazzar)',
        createdAt: new Date().toISOString(),
      };

      if (!local.inventoryMovements) local.inventoryMovements = [];
      local.inventoryMovements.unshift(movement);
      writeDbJson(local);

      return {
        media,
        movement,
      };
    },

    listMovements: async (mediaId?: string) => {
      try {
        const list = await prisma.inventoryMovement.findMany({
          where: mediaId ? { mediaId } : undefined,
          include: { media: true, user: true },
          orderBy: { createdAt: 'desc' },
        });
        return list.map((mov) => ({
          ...mov,
          mediaName: `${mov.media.gsm} GSM ${mov.media.name} (${mov.media.size})`,
          userName: mov.user.name,
          createdAt: mov.createdAt.toISOString(),
        }));
      } catch {
        return [];
      }
    },
  },

  // --- WASTAGE REASONS ---
  wastageReasons: {
    list: async () => {
      try {
        let list = await prisma.wastageReason.findMany({ where: { isActive: true } });
        if (list.length === 0) {
          for (const wr of INITIAL_WASTAGE_REASONS) {
            await prisma.wastageReason.create({ data: wr });
          }
          list = await prisma.wastageReason.findMany({ where: { isActive: true } });
        }
        return list.map((wr) => ({
          ...wr,
          createdAt: wr.createdAt.toISOString(),
        }));
      } catch {
        return INITIAL_WASTAGE_REASONS.map((wr) => ({
          ...wr,
          createdAt: new Date().toISOString(),
        }));
      }
    },
    create: async (reason: string) => {
      const created = await prisma.wastageReason.create({
        data: { reason: reason.trim(), isActive: true },
      });
      return {
        ...created,
        createdAt: created.createdAt.toISOString(),
      };
    },
  },

  // --- JOBS & PRODUCTION ---
  jobs: {
    create: async (params: any) => {
      try {
        // Fetch all required relations concurrently in parallel (High performance)
        const [media, machine, userExists, rate, wr] = await Promise.all([
          prisma.media.findUnique({ where: { id: params.mediaId } }),
          prisma.machine.findUnique({ where: { id: params.machineId } }),
          params.operatorId ? prisma.user.findUnique({ where: { id: params.operatorId } }) : Promise.resolve(null),
          prisma.printRate.findUnique({
            where: {
              machineId_paperSize_printType: {
                machineId: params.machineId,
                paperSize: params.paperSize,
                printType: params.printType,
              },
            },
          }),
          params.wastageReasonId ? prisma.wastageReason.findUnique({ where: { id: params.wastageReasonId } }) : Promise.resolve(null),
        ]);

        if (!media) throw new Error('Media not found');
        if (!machine) throw new Error('Machine not found');

        let validOperatorId = userExists ? userExists.id : params.operatorId;
        if (!userExists) {
          const firstUser = await prisma.user.findFirst();
          if (firstUser) validOperatorId = firstUser.id;
        }

        const resolvedRate = resolvePrintRate({
          paperSize: params.paperSize,
          printType: params.printType,
          selectedTier: params.selectedTier,
          dbRates: rate ? [{
            paperSize: rate.paperSize,
            printType: rate.printType,
            rate: Number(rate.rate),
            tier2Rate: rate.tier2Rate ? Number(rate.tier2Rate) : Number(rate.rate),
            tierThreshold: rate.tierThreshold,
            gstPercent: Number(rate.gstPercent),
          }] : undefined,
        });

        const unitRateVal = params.unitRate !== undefined ? Number(params.unitRate) : resolvedRate.rate;
        const gstVal = rate ? Number(rate.gstPercent) : resolvedRate.gstPercent;

        const calc = calculateJobProduction({
          goodPrints: params.goodPrints,
          wastage: params.wastage || 0,
          reprint: params.reprint || 0,
          printSide: params.printSide,
          unitRate: unitRateVal,
          gstPercent: gstVal,
        });

        if (media.currentStock < calc.sheetConsumption) {
          throw new Error(
            `INSUFFICIENT STOCK: Media '${media.name}' has ${media.currentStock} sheets, but job requires ${calc.sheetConsumption} sheets.`
          );
        }

        const openingStock = media.currentStock;
        const closingStock = openingStock - calc.sheetConsumption;

        const productionDate = params.productionDate ? new Date(params.productionDate) : new Date();
        const validWastageReasonId = wr ? wr.id : undefined;

        const [createdJob] = await prisma.$transaction([
          prisma.jobProduction.create({
            data: {
              jobNumber: params.jobNumber,
              customerName: params.customerName,
              product: params.product,
              orderedQuantity: params.orderedQuantity,
              printType: params.printType,
              paperSize: params.paperSize,
              printSide: params.printSide,
              mediaId: params.mediaId,
              machineId: params.machineId,
              goodPrints: params.goodPrints,
              wastage: params.wastage || 0,
              reprint: params.reprint || 0,
              reprintType: params.reprintType || undefined,
              sheetConsumption: calc.sheetConsumption,
              machineClicks: calc.machineClicks,
              unitCost: calc.unitCost,
              totalCost: calc.totalCost,
              gstAmount: calc.gstAmount,
              grandTotalCost: calc.grandTotalCost,
              wastageReasonId: validWastageReasonId,
              wastageReasonOther: params.wastageReasonOther || undefined,
              wastagePhotoUrl: params.wastagePhotoUrl || undefined,
              remarks: params.remarks || undefined,
              operatorId: validOperatorId,
              productionDate,
            },
          }),
          prisma.media.update({
            where: { id: params.mediaId },
            data: { currentStock: closingStock },
          }),
          prisma.inventoryMovement.create({
            data: {
              mediaId: params.mediaId,
              quantity: -calc.sheetConsumption,
              openingStock,
              closingStock,
              movementType: 'STOCK_OUT',
              referenceId: params.jobNumber,
              reason: `Production for Job #${params.jobNumber} (${params.customerName})`,
              userId: validOperatorId,
            },
          }),
          prisma.auditLog.create({
            data: {
              userId: validOperatorId,
              action: 'JOB_CREATED',
              entity: 'JobProduction',
              entityId: params.jobNumber,
              newValue: {
                jobNumber: params.jobNumber,
                clicks: calc.machineClicks,
                sheets: calc.sheetConsumption,
              },
            },
          }),
        ]);

        if (closingStock <= media.minimumStockLevel) {
          prisma.notification.create({
            data: {
              title: `Low Stock: ${media.gsm} GSM ${media.name}`,
              message: `Stock is ${closingStock} sheets (Min: ${media.minimumStockLevel}).`,
              type: 'LOW_STOCK',
              linkUrl: '/inventory',
            },
          }).catch(() => {});
        }

        return {
          ...createdJob,
          unitCost: Number(createdJob.unitCost),
          totalCost: Number(createdJob.totalCost),
          gstAmount: Number(createdJob.gstAmount),
          grandTotalCost: Number(createdJob.grandTotalCost),
          mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
          machineName: machine.name,
          operatorName: userExists?.name || 'Owner (Print Bazzar)',
          productionDate: createdJob.productionDate.toISOString().split('T')[0],
          createdAt: createdJob.createdAt.toISOString(),
          updatedAt: createdJob.updatedAt.toISOString(),
        };
      } catch (prismaErr: any) {
        console.warn('Prisma create failed, falling back to db.json storage:', prismaErr.message);
        const local = readDbJson();
        const media = (local.media || []).find((m: any) => m.id === params.mediaId);
        if (!media) throw new Error('Media not found');

        const rate = (local.rates || []).find(
          (r: any) => r.paperSize === params.paperSize && r.printType === params.printType
        );

        const resolvedRate = resolvePrintRate({
          paperSize: params.paperSize,
          printType: params.printType,
          selectedTier: params.selectedTier,
          dbRates: rate ? [{
            paperSize: rate.paperSize,
            printType: rate.printType,
            rate: Number(rate.rate),
            tier2Rate: rate.tier2Rate ? Number(rate.tier2Rate) : Number(rate.rate),
            tierThreshold: rate.tierThreshold,
            gstPercent: Number(rate.gstPercent),
          }] : undefined,
        });

        const unitRateVal = params.unitRate !== undefined ? Number(params.unitRate) : resolvedRate.rate;
        const gstVal = rate ? Number(rate.gstPercent) : resolvedRate.gstPercent;

        const calc = calculateJobProduction({
          goodPrints: params.goodPrints,
          wastage: params.wastage || 0,
          reprint: params.reprint || 0,
          printSide: params.printSide,
          unitRate: unitRateVal,
          gstPercent: gstVal,
        });

        if (media.currentStock < calc.sheetConsumption) {
          throw new Error(
            `INSUFFICIENT STOCK: Media '${media.name}' has ${media.currentStock} sheets, but job requires ${calc.sheetConsumption} sheets.`
          );
        }

        media.currentStock = Math.max(0, (media.currentStock || 0) - calc.sheetConsumption);
        media.updatedAt = new Date().toISOString();

        const createdJob = {
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          jobNumber: params.jobNumber,
          customerName: params.customerName,
          product: params.product,
          orderedQuantity: Number(params.orderedQuantity) || 1,
          printType: params.printType,
          paperSize: params.paperSize,
          printSide: params.printSide,
          mediaId: params.mediaId,
          machineId: params.machineId || 'mach-c3070-001',
          goodPrints: params.goodPrints,
          wastage: params.wastage || 0,
          reprint: params.reprint || 0,
          reprintType: params.reprintType || undefined,
          sheetConsumption: calc.sheetConsumption,
          machineClicks: calc.machineClicks,
          unitCost: calc.unitCost,
          totalCost: calc.totalCost,
          gstAmount: calc.gstAmount,
          grandTotalCost: calc.grandTotalCost,
          wastageReasonId: params.wastageReasonId || undefined,
          wastageReasonOther: params.wastageReasonOther || undefined,
          remarks: params.remarks || undefined,
          operatorId: params.operatorId || 'usr-owner-001',
          productionDate: params.productionDate || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
          machineName: 'Konica Minolta C3070',
          operatorName: 'Owner (Print Bazzar)',
        };

        if (!local.jobs) local.jobs = [];
        local.jobs.unshift(createdJob);
        writeDbJson(local);

        return createdJob;
      }
    },

    list: async (filter?: any) => {
      try {
        const whereClause: any = {};
        if (filter?.date) {
          const start = new Date(filter.date + 'T00:00:00.000Z');
          const end = new Date(filter.date + 'T23:59:59.999Z');
          whereClause.productionDate = { gte: start, lte: end };
        } else if (filter?.startDate || filter?.endDate) {
          whereClause.productionDate = {};
          if (filter.startDate) whereClause.productionDate.gte = new Date(filter.startDate + 'T00:00:00.000Z');
          if (filter.endDate) whereClause.productionDate.lte = new Date(filter.endDate + 'T23:59:59.999Z');
        }
        if (filter?.operatorId) whereClause.operatorId = filter.operatorId;
        if (filter?.machineId) whereClause.machineId = filter.machineId;
        if (filter?.search) {
          whereClause.OR = [
            { jobNumber: { contains: filter.search, mode: 'insensitive' } },
            { customerName: { contains: filter.search, mode: 'insensitive' } },
            { product: { contains: filter.search, mode: 'insensitive' } },
          ];
        }

        const jobs = await prisma.jobProduction.findMany({
          where: whereClause,
          include: {
            media: { select: { id: true, name: true, gsm: true, size: true } },
            machine: { select: { id: true, name: true } },
            operator: { select: { id: true, name: true } },
            wastageReason: { select: { id: true, reason: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: filter?.limit || 200,
        });

        return jobs.map((j) => ({
          ...j,
          unitCost: Number(j.unitCost),
          totalCost: Number(j.totalCost),
          gstAmount: Number(j.gstAmount),
          grandTotalCost: Number(j.grandTotalCost),
          mediaName: j.media ? `${j.media.gsm} GSM ${j.media.name} (${j.media.size})` : 'Media',
          machineName: j.machine?.name || 'Konica Minolta C3070',
          operatorName: j.operator?.name || 'Owner (Print Bazzar)',
          wastageReasonName: j.wastageReason?.reason,
          productionDate: j.productionDate.toISOString().split('T')[0],
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        }));
      } catch (err) {
        console.warn('db.jobs.list fallback to db.json:', err);
        const local = readDbJson();
        let list: any[] = local.jobs || [];

        if (filter?.date) {
          list = list.filter((j) => (j.productionDate || '').startsWith(filter.date));
        } else if (filter?.startDate || filter?.endDate) {
          if (filter.startDate) list = list.filter((j) => (j.productionDate || '') >= filter.startDate);
          if (filter.endDate) list = list.filter((j) => (j.productionDate || '') <= filter.endDate);
        }
        if (filter?.operatorId) list = list.filter((j) => j.operatorId === filter.operatorId);
        if (filter?.machineId) list = list.filter((j) => j.machineId === filter.machineId);
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          list = list.filter((j) =>
            (j.jobNumber || '').toLowerCase().includes(s) ||
            (j.customerName || '').toLowerCase().includes(s) ||
            (j.product || '').toLowerCase().includes(s)
          );
        }

        return list.map((j) => ({
          ...j,
          unitCost: Number(j.unitCost || 0),
          totalCost: Number(j.totalCost || 0),
          gstAmount: Number(j.gstAmount || 0),
          grandTotalCost: Number(j.grandTotalCost || 0),
          mediaName: j.mediaName || 'Media',
          machineName: j.machineName || 'Konica Minolta C3070',
          operatorName: j.operatorName || 'Owner (Print Bazzar)',
          wastageReasonName: j.wastageReasonName || j.wastageReason?.reason,
          productionDate: (j.productionDate || '').split('T')[0],
          createdAt: j.createdAt || new Date().toISOString(),
          updatedAt: j.updatedAt || new Date().toISOString(),
        }));
      }
    },

    getById: async (id: string) => {
      try {
        const j = await prisma.jobProduction.findUnique({
          where: { id },
          include: { media: true, machine: true, operator: true, wastageReason: true },
        });
        if (j) {
          return {
            ...j,
            unitCost: Number(j.unitCost),
            totalCost: Number(j.totalCost),
            gstAmount: Number(j.gstAmount),
            grandTotalCost: Number(j.grandTotalCost),
            mediaName: `${j.media.gsm} GSM ${j.media.name} (${j.media.size})`,
            machineName: j.machine.name,
            operatorName: j.operator?.name || 'Owner (Print Bazzar)',
            wastageReasonName: j.wastageReason?.reason,
            productionDate: j.productionDate.toISOString().split('T')[0],
            createdAt: j.createdAt.toISOString(),
            updatedAt: j.updatedAt.toISOString(),
          };
        }
      } catch {
        // Fall back to db.json
      }
      const local = readDbJson();
      const j = (local.jobs || []).find((item: any) => item.id === id || item.jobNumber === id);
      return j ? {
        ...j,
        unitCost: Number(j.unitCost || 0),
        totalCost: Number(j.totalCost || 0),
        gstAmount: Number(j.gstAmount || 0),
        grandTotalCost: Number(j.grandTotalCost || 0),
        mediaName: j.mediaName || 'Media',
        machineName: j.machineName || 'Konica Minolta C3070',
        operatorName: j.operatorName || 'Owner (Print Bazzar)',
        productionDate: (j.productionDate || '').split('T')[0],
        createdAt: j.createdAt || new Date().toISOString(),
        updatedAt: j.updatedAt || new Date().toISOString(),
      } : undefined;
    },

    update: async (id: string, updates: any, userId?: string) => {
      try {
        const existingJob = await prisma.jobProduction.findUnique({
          where: { id },
          include: { media: true, machine: true, operator: true, wastageReason: true },
        });
        if (existingJob) {
          let validUserId = userId;
          if (!validUserId) {
            const firstUser = await prisma.user.findFirst();
            validUserId = firstUser?.id || 'usr-owner-001';
          }

          // 1. Resolve fields with defaults from existingJob
          const targetJobNumber = updates.jobNumber ? String(updates.jobNumber).trim() : existingJob.jobNumber;
          const targetCustomerName = updates.customerName ? String(updates.customerName).trim() : existingJob.customerName;
          const targetProduct = updates.product ? String(updates.product).trim() : existingJob.product;
          const targetOrderedQuantity = updates.orderedQuantity !== undefined ? Math.max(1, Number(updates.orderedQuantity)) : existingJob.orderedQuantity;
          const targetPrintType = (updates.printType || existingJob.printType) as PrintType;
          const targetPaperSize = (updates.paperSize || existingJob.paperSize) as PaperSize;
          const targetPrintSide = (updates.printSide || existingJob.printSide) as PrintSide;
          const targetMediaId = updates.mediaId || existingJob.mediaId;
          const targetMachineId = updates.machineId || existingJob.machineId;

          const targetGoodPrints = updates.goodPrints !== undefined ? Math.max(0, Number(updates.goodPrints)) : existingJob.goodPrints;
          const targetWastage = updates.wastage !== undefined ? Math.max(0, Number(updates.wastage)) : existingJob.wastage;
          const targetRepprint = updates.reprint !== undefined ? Math.max(0, Number(updates.reprint)) : existingJob.reprint;
          const targetReprintType = updates.reprintType !== undefined ? (updates.reprintType || null) : existingJob.reprintType;

          const targetWastageReasonId = updates.wastageReasonId !== undefined ? (updates.wastageReasonId || null) : existingJob.wastageReasonId;
          const targetWastageReasonOther = updates.wastageReasonOther !== undefined ? (updates.wastageReasonOther || null) : existingJob.wastageReasonOther;
          const targetRemarks = updates.remarks !== undefined ? (updates.remarks || null) : existingJob.remarks;
          const targetProductionDate = updates.productionDate ? new Date(updates.productionDate) : existingJob.productionDate;

          // 2. Fetch machine rate and new media
          const [rate, newMedia] = await Promise.all([
            prisma.printRate.findUnique({
              where: {
                machineId_paperSize_printType: {
                  machineId: targetMachineId,
                  paperSize: targetPaperSize,
                  printType: targetPrintType,
                },
              },
            }),
            prisma.media.findUnique({ where: { id: targetMediaId } }),
          ]);

          if (!newMedia) throw new Error('Target media not found');

          const resolvedRate = resolvePrintRate({
            paperSize: targetPaperSize,
            printType: targetPrintType,
            selectedTier: updates.selectedTier,
            dbRates: rate ? [{
              paperSize: rate.paperSize,
              printType: rate.printType,
              rate: Number(rate.rate),
              tier2Rate: rate.tier2Rate ? Number(rate.tier2Rate) : Number(rate.rate),
              tierThreshold: rate.tierThreshold,
              gstPercent: Number(rate.gstPercent),
            }] : undefined,
          });

          const unitRateVal = updates.unitRate !== undefined ? Number(updates.unitRate) : resolvedRate.rate;
          const gstVal = rate ? Number(rate.gstPercent) : resolvedRate.gstPercent;

          const calc = calculateJobProduction({
            goodPrints: targetGoodPrints,
            wastage: targetWastage,
            reprint: targetRepprint,
            printSide: targetPrintSide,
            unitRate: unitRateVal,
            gstPercent: gstVal,
          });

          const oldMediaId = existingJob.mediaId;
          const oldConsumption = existingJob.sheetConsumption;
          const newConsumption = calc.sheetConsumption;

          let updatedJobResult: any = null;

          if (oldMediaId === targetMediaId) {
            const sheetDiff = newConsumption - oldConsumption;
            if (sheetDiff > 0 && newMedia.currentStock < sheetDiff) {
              throw new Error(
                `INSUFFICIENT STOCK: Media '${newMedia.name}' has ${newMedia.currentStock} sheets, but this edit requires ${sheetDiff} additional sheets.`
              );
            }

            const newStock = newMedia.currentStock - sheetDiff;

            await prisma.$transaction(async (tx) => {
              if (sheetDiff !== 0) {
                await tx.media.update({
                  where: { id: targetMediaId },
                  data: { currentStock: newStock },
                });

                await tx.inventoryMovement.create({
                  data: {
                    mediaId: targetMediaId,
                    quantity: -sheetDiff,
                    openingStock: newMedia.currentStock,
                    closingStock: newStock,
                    movementType: 'STOCK_ADJUSTMENT',
                    referenceId: `EDIT-${targetJobNumber}`,
                    reason: sheetDiff > 0
                      ? `Additional ${sheetDiff} sheets consumed for edited Job #${targetJobNumber}`
                      : `Restored ${Math.abs(sheetDiff)} sheets from edited Job #${targetJobNumber}`,
                    userId: validUserId,
                  },
                });
              }

              updatedJobResult = await tx.jobProduction.update({
                where: { id },
                data: {
                  jobNumber: targetJobNumber,
                  customerName: targetCustomerName,
                  product: targetProduct,
                  orderedQuantity: targetOrderedQuantity,
                  printType: targetPrintType,
                  paperSize: targetPaperSize,
                  printSide: targetPrintSide,
                  mediaId: targetMediaId,
                  machineId: targetMachineId,
                  goodPrints: targetGoodPrints,
                  wastage: targetWastage,
                  reprint: targetRepprint,
                  reprintType: targetReprintType,
                  sheetConsumption: calc.sheetConsumption,
                  machineClicks: calc.machineClicks,
                  unitCost: calc.unitCost,
                  totalCost: calc.totalCost,
                  gstAmount: calc.gstAmount,
                  grandTotalCost: calc.grandTotalCost,
                  wastageReasonId: targetWastageReasonId,
                  wastageReasonOther: targetWastageReasonOther,
                  remarks: targetRemarks,
                  productionDate: targetProductionDate,
                },
                include: {
                  media: { select: { id: true, name: true, gsm: true, size: true } },
                  machine: { select: { id: true, name: true } },
                  operator: { select: { id: true, name: true } },
                  wastageReason: { select: { id: true, reason: true } },
                },
              });

              await tx.auditLog.create({
                data: {
                  userId: validUserId,
                  action: 'JOB_UPDATED',
                  entity: 'JobProduction',
                  entityId: targetJobNumber,
                  newValue: {
                    jobNumber: targetJobNumber,
                    mediaChangedFrom: existingJob.media?.name || 'Previous Media',
                    mediaChangedTo: newMedia.name,
                    sheetsConsumed: newConsumption,
                  },
                },
              });
            });
          }

          const j = updatedJobResult || existingJob;
          return {
            ...j,
            unitCost: Number(j.unitCost),
            totalCost: Number(j.totalCost),
            gstAmount: Number(j.gstAmount),
            grandTotalCost: Number(j.grandTotalCost),
            mediaName: j.media ? `${j.media.gsm} GSM ${j.media.name} (${j.media.size})` : 'Media',
            machineName: j.machine?.name || 'Konica Minolta C3070',
            operatorName: j.operator?.name || 'Owner (Print Bazzar)',
            wastageReasonName: j.wastageReason?.reason,
            productionDate: j.productionDate.toISOString().split('T')[0],
            createdAt: j.createdAt.toISOString(),
            updatedAt: j.updatedAt.toISOString(),
          };
        }
      } catch (err: any) {
        console.warn('Prisma job update fallback to db.json:', err.message);
      }

      const local = readDbJson();
      const job = (local.jobs || []).find((j: any) => j.id === id || j.jobNumber === id);
      if (!job) throw new Error('Job not found');

      if (updates.customerName !== undefined) job.customerName = String(updates.customerName).trim();
      if (updates.product !== undefined) job.product = String(updates.product).trim();
      if (updates.orderedQuantity !== undefined) job.orderedQuantity = Number(updates.orderedQuantity);
      if (updates.goodPrints !== undefined) job.goodPrints = Number(updates.goodPrints);
      if (updates.wastage !== undefined) job.wastage = Number(updates.wastage);
      if (updates.reprint !== undefined) job.reprint = Number(updates.reprint);
      if (updates.remarks !== undefined) job.remarks = updates.remarks;

      const calc = calculateJobProduction({
        goodPrints: job.goodPrints,
        wastage: job.wastage || 0,
        reprint: job.reprint || 0,
        printSide: job.printSide || 'SINGLE',
        unitRate: job.unitCost || 4.25,
        gstPercent: 18,
      });

      job.sheetConsumption = calc.sheetConsumption;
      job.machineClicks = calc.machineClicks;
      job.totalCost = calc.totalCost;
      job.gstAmount = calc.gstAmount;
      job.grandTotalCost = calc.grandTotalCost;
      job.updatedAt = new Date().toISOString();

      writeDbJson(local);
      return job;
    },

    delete: async (id: string, userId?: string) => {
      try {
        const job = await prisma.jobProduction.findUnique({
          where: { id },
          include: { media: true },
        });
        if (job) {
          let validUserId = userId;
          if (!validUserId) {
            const firstUser = await prisma.user.findFirst();
            validUserId = firstUser?.id || 'usr-owner-001';
          }

          const sheetsToRestore = job.sheetConsumption;
          const currentStock = job.media.currentStock;
          const restoredStock = currentStock + sheetsToRestore;

          await prisma.$transaction([
            prisma.jobProduction.delete({ where: { id } }),
            prisma.media.update({
              where: { id: job.mediaId },
              data: { currentStock: restoredStock },
            }),
            prisma.inventoryMovement.create({
              data: {
                mediaId: job.mediaId,
                quantity: sheetsToRestore,
                openingStock: currentStock,
                closingStock: restoredStock,
                movementType: 'STOCK_ADJUSTMENT',
                referenceId: `ROLLBACK-${job.jobNumber}`,
                reason: `Restored ${sheetsToRestore} sheets from deleted Job #${job.jobNumber} (${job.customerName})`,
                userId: validUserId,
              },
            }),
            prisma.auditLog.create({
              data: {
                userId: validUserId,
                action: 'JOB_DELETED',
                entity: 'JobProduction',
                entityId: job.jobNumber,
                newValue: {
                  jobNumber: job.jobNumber,
                  customerName: job.customerName,
                  restoredSheets: sheetsToRestore,
                  reason: 'Mistake correction / job deleted',
                },
              },
            }),
          ]);

          return {
            success: true,
            message: `Job #${job.jobNumber} deleted successfully. ${sheetsToRestore} sheets restored to stock.`,
            restoredSheets: sheetsToRestore,
            newStock: restoredStock,
          };
        }
      } catch (err) {
        console.warn('Prisma job delete fallback to db.json:', err);
      }

      const local = readDbJson();
      const jobIdx = (local.jobs || []).findIndex((j: any) => j.id === id || j.jobNumber === id);
      if (jobIdx === -1) throw new Error('Job not found');

      const job = local.jobs[jobIdx];
      const sheetsToRestore = job.sheetConsumption || 0;
      const media = (local.media || []).find((m: any) => m.id === job.mediaId);
      let newStock = 0;
      if (media) {
        media.currentStock = (media.currentStock || 0) + sheetsToRestore;
        newStock = media.currentStock;
      }
      local.jobs.splice(jobIdx, 1);
      writeDbJson(local);

      return {
        success: true,
        message: `Job #${job.jobNumber} deleted successfully. ${sheetsToRestore} sheets restored to stock.`,
        restoredSheets: sheetsToRestore,
        newStock,
      };
    },
  },

  // --- DAILY MACHINE COUNTERS ---
  counters: {
    getOrInitToday: async (machineId: string, dateStr?: string) => {
      const dateOnlyStr = dateStr || new Date().toISOString().split('T')[0];
      const targetDate = new Date(`${dateOnlyStr}T00:00:00.000Z`);

      try {
        // Aggregate today's job clicks
        const jobs = await prisma.jobProduction.findMany({
          where: { machineId },
        });
        const todaysJobs = jobs.filter((j) => j.productionDate.toISOString().split('T')[0] === dateOnlyStr);
        const totalJobClicksToday = todaysJobs.reduce((acc, j) => acc + j.machineClicks, 0);

        // Find existing counter for this machine & date
        let counter = await prisma.dailyMachineCounter.findFirst({
          where: {
            machineId,
            date: targetDate,
          },
        });

        if (!counter) {
          // Find latest previous closing counter for opening counter reference
          const prevCounter = await prisma.dailyMachineCounter.findFirst({
            where: {
              machineId,
              date: { lt: targetDate },
              closingCounter: { not: null },
            },
            orderBy: { date: 'desc' },
          });

          const machine = await prisma.machine.findUnique({ where: { id: machineId } });
          const openingCounter = prevCounter?.closingCounter || machine?.currentCounter || INITIAL_MACHINE.initialCounter;

          counter = await prisma.dailyMachineCounter.create({
            data: {
              machineId,
              date: targetDate,
              openingCounter,
              totalJobClicks: totalJobClicksToday,
              difference: 0,
              isMatched: true,
              isClosed: false,
            },
          });
        } else if (!counter.isClosed) {
          counter = await prisma.dailyMachineCounter.update({
            where: { id: counter.id },
            data: { totalJobClicks: totalJobClicksToday },
          });
        }

        return {
          counter: {
            ...counter,
            date: dateOnlyStr,
            createdAt: counter.createdAt.toISOString(),
            updatedAt: counter.updatedAt.toISOString(),
          },
          totalJobClicksToday,
        };
      } catch (err) {
        console.warn('getOrInitToday fallback to db.json:', err);
        const local = readDbJson();
        const localJobs: any[] = local.jobs || [];
        const todaysJobs = localJobs.filter(
          (j: any) => (j.productionDate || '').split('T')[0] === dateOnlyStr
        );
        const totalJobClicksToday = todaysJobs.reduce(
          (acc, j) => acc + (Number(j.machineClicks) || 0),
          0
        );

        let counter = (local.dailyCounters || []).find(
          (c: any) => (c.date || '').split('T')[0] === dateOnlyStr
        );

        if (!counter) {
          const prevCounter = (local.dailyCounters || [])
            .filter((c: any) => (c.date || '').split('T')[0] < dateOnlyStr && c.closingCounter != null)
            .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))[0];

          const openingCounter =
            prevCounter?.closingCounter ||
            local.machines?.[0]?.currentCounter ||
            INITIAL_MACHINE.initialCounter;

          counter = {
            id: `dc-${Date.now()}`,
            machineId,
            date: dateOnlyStr,
            openingCounter,
            closingCounter: null as number | null,
            machinePrintCount: null as number | null,
            totalJobClicks: totalJobClicksToday,
            difference: 0,
            isMatched: true,
            mismatchReason: null as string | null,
            isClosed: false,
            closedById: null as string | null,
            closedAt: null as Date | null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (!local.dailyCounters) local.dailyCounters = [];
          local.dailyCounters.push(counter);
          writeDbJson(local);
        } else if (!counter.isClosed) {
          counter.totalJobClicks = totalJobClicksToday;
        }

        return {
          counter: {
            ...counter,
            date: dateOnlyStr,
          },
          totalJobClicksToday,
        };
      }
    },

    closeDay: async (params: any) => {
      const { counter, totalJobClicksToday } = await db.counters.getOrInitToday(
        params.machineId,
        params.date
      );

      const closing = Math.max(counter.openingCounter, Math.floor(params.closingCounter));
      const recon = reconcileMachineCounter({
        openingCounter: counter.openingCounter,
        closingCounter: closing,
        totalJobClicks: totalJobClicksToday,
      });

      if (!recon.isMatched && !params.mismatchReason?.trim()) {
        throw new Error(
          `MACHINE COUNT MISMATCH: Machine Print Count (${recon.machinePrintCount}) does not match Total Job Clicks (${recon.totalJobClicks}). Difference: ${recon.difference} clicks. A valid explanation reason is required to close the day.`
        );
      }

      try {
        let validUserId = params.userId;
        const userExists = await prisma.user.findUnique({ where: { id: params.userId } });
        if (!userExists) {
          const firstUser = await prisma.user.findFirst();
          if (firstUser) validUserId = firstUser.id;
        }

        const [updatedCounter] = await prisma.$transaction([
          prisma.dailyMachineCounter.update({
            where: { id: counter.id },
            data: {
              closingCounter: closing,
              machinePrintCount: recon.machinePrintCount,
              totalJobClicks: totalJobClicksToday,
              difference: recon.difference,
              isMatched: recon.isMatched,
              mismatchReason: params.mismatchReason?.trim() || undefined,
              isClosed: true,
              closedById: validUserId,
              closedAt: new Date(),
            },
          }),
          prisma.machine.update({
            where: { id: params.machineId },
            data: { currentCounter: closing },
          }),
          prisma.auditLog.create({
            data: {
              userId: validUserId,
              action: 'DAY_CLOSED',
              entity: 'DailyMachineCounter',
              entityId: counter.id,
              newValue: {
                opening: counter.openingCounter,
                closing,
                machineClicks: recon.machinePrintCount,
                jobClicks: totalJobClicksToday,
                difference: recon.difference,
                mismatchReason: params.mismatchReason,
              },
            },
          }),
        ]);

        return {
          ...updatedCounter,
          date: params.date || updatedCounter.date.toISOString().split('T')[0],
          createdAt: updatedCounter.createdAt.toISOString(),
          updatedAt: updatedCounter.updatedAt.toISOString(),
        };
      } catch (err) {
        console.warn('closeDay fallback to db.json:', err);
        const local = readDbJson();
        const c = (local.dailyCounters || []).find((x: any) => x.id === counter.id || x.date === counter.date);
        if (c) {
          c.closingCounter = closing;
          c.machinePrintCount = recon.machinePrintCount;
          c.totalJobClicks = totalJobClicksToday;
          c.difference = recon.difference;
          c.isMatched = recon.isMatched;
          c.mismatchReason = params.mismatchReason?.trim() || null;
          c.isClosed = true;
          c.closedAt = new Date().toISOString();
          c.updatedAt = new Date().toISOString();
        }
        if (local.machines && local.machines[0]) {
          local.machines[0].currentCounter = closing;
        }
        writeDbJson(local);

        return c || {
          ...counter,
          closingCounter: closing,
          isClosed: true,
        };
      }
    },

    update: async (id: string, updates: any, userId?: string) => {
      try {
        const counter = await prisma.dailyMachineCounter.findUnique({
          where: { id },
          include: { machine: true, closedBy: true },
        });
        if (counter) {
          let validUserId = userId;
          if (!validUserId) {
            const firstUser = await prisma.user.findFirst();
            validUserId = firstUser?.id || 'usr-owner-001';
          }

          const newOpening = updates.openingCounter !== undefined ? Math.max(0, Math.floor(Number(updates.openingCounter))) : counter.openingCounter;

          let newClosing: number | null = null;
          if (updates.closingCounter !== undefined) {
            if (updates.closingCounter === null || updates.closingCounter === '') {
              newClosing = null;
            } else {
              newClosing = Math.max(newOpening, Math.floor(Number(updates.closingCounter)));
            }
          } else {
            newClosing = counter.closingCounter;
          }

          let machinePrintCount: number | null = null;
          let difference = 0;
          let isMatched = true;

          if (newClosing !== null) {
            const recon = reconcileMachineCounter({
              openingCounter: newOpening,
              closingCounter: newClosing,
              totalJobClicks: counter.totalJobClicks,
            });
            machinePrintCount = recon.machinePrintCount;
            difference = recon.difference;
            isMatched = recon.isMatched;

            if (!isMatched && updates.isClosed && !(updates.mismatchReason?.trim() || counter.mismatchReason?.trim())) {
              throw new Error(`MACHINE COUNT MISMATCH: Difference of ${difference} clicks detected. Please provide an explanatory reason.`);
            }
          }

          const isClosed = updates.isClosed !== undefined ? Boolean(updates.isClosed) : (newClosing !== null ? counter.isClosed : false);
          const mismatchReason = updates.mismatchReason !== undefined ? (updates.mismatchReason?.trim() || null) : counter.mismatchReason;

          const [updated] = await prisma.$transaction([
            prisma.dailyMachineCounter.update({
              where: { id },
              data: {
                openingCounter: newOpening,
                closingCounter: newClosing,
                machinePrintCount,
                difference,
                isMatched,
                mismatchReason,
                isClosed,
                closedById: isClosed ? validUserId : null,
                closedAt: isClosed ? (counter.closedAt || new Date()) : null,
              },
              include: { closedBy: true },
            }),
            ...(isClosed && newClosing !== null ? [
              prisma.machine.update({
                where: { id: counter.machineId },
                data: { currentCounter: newClosing },
              }),
            ] : []),
            prisma.auditLog.create({
              data: {
                userId: validUserId,
                action: 'COUNTER_UPDATED',
                entity: 'DailyMachineCounter',
                entityId: counter.id,
                newValue: {
                  date: counter.date.toISOString().split('T')[0],
                  oldOpening: counter.openingCounter,
                  newOpening,
                  oldClosing: counter.closingCounter,
                  newClosing,
                  isClosed,
                  mismatchReason,
                },
              },
            }),
          ]);

          return {
            ...updated,
            date: updated.date.toISOString().split('T')[0],
            closedByName: updated.closedBy?.name,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          };
        }
      } catch (err: any) {
        console.warn('Prisma counter update fallback to db.json:', err.message);
      }

      const local = readDbJson();
      const c = (local.dailyCounters || []).find((x: any) => x.id === id);
      if (c) {
        if (updates.openingCounter !== undefined) c.openingCounter = Number(updates.openingCounter);
        if (updates.closingCounter !== undefined) {
          c.closingCounter = updates.closingCounter !== null && updates.closingCounter !== '' ? Number(updates.closingCounter) : null;
        }
        if (c.closingCounter !== null) {
          c.machinePrintCount = c.closingCounter - c.openingCounter;
          c.difference = c.machinePrintCount - (c.totalJobClicks || 0);
          c.isMatched = c.difference === 0;
        }
        if (updates.isClosed !== undefined) c.isClosed = Boolean(updates.isClosed);
        if (updates.mismatchReason !== undefined) c.mismatchReason = updates.mismatchReason;
        c.updatedAt = new Date().toISOString();
        if (c.isClosed && c.closingCounter !== null && local.machines && local.machines[0]) {
          local.machines[0].currentCounter = c.closingCounter;
        }
        writeDbJson(local);
        return c;
      }
      throw new Error('Counter record not found');
    },

    delete: async (id: string, userId?: string) => {
      try {
        const counter = await prisma.dailyMachineCounter.findUnique({
          where: { id },
          include: { machine: true },
        });
        if (counter) {
          let validUserId = userId;
          if (!validUserId) {
            const firstUser = await prisma.user.findFirst();
            validUserId = firstUser?.id || 'usr-owner-001';
          }

          const dateStr = counter.date.toISOString().split('T')[0];

          await prisma.$transaction(async (tx) => {
            await tx.jobProduction.updateMany({
              where: { dailyCounterId: id },
              data: { dailyCounterId: null },
            });
            await tx.dailyMachineCounter.delete({ where: { id } });
            const latestRemaining = await tx.dailyMachineCounter.findFirst({
              where: {
                machineId: counter.machineId,
                isClosed: true,
                id: { not: id },
              },
              orderBy: { date: 'desc' },
            });
            const restoredCounter = latestRemaining?.closingCounter || counter.openingCounter || counter.machine.initialCounter;
            await tx.machine.update({
              where: { id: counter.machineId },
              data: { currentCounter: restoredCounter },
            });
          });

          return {
            success: true,
            message: `Counter entry for ${dateStr} deleted successfully. You can now enter a fresh count.`,
            date: dateStr,
          };
        }
      } catch (err: any) {
        console.warn('Prisma counter delete fallback to db.json:', err.message);
      }

      const local = readDbJson();
      const cIdx = (local.dailyCounters || []).findIndex((x: any) => x.id === id);
      if (cIdx !== -1) {
        const removed = local.dailyCounters.splice(cIdx, 1)[0];
        writeDbJson(local);
        return {
          success: true,
          message: `Counter entry for ${removed.date} deleted successfully.`,
          date: removed.date,
        };
      }
      return { success: true, message: 'Deleted' };
    },

    list: async (machineId?: string) => {
      try {
        const list = await prisma.dailyMachineCounter.findMany({
          where: machineId ? { machineId } : undefined,
          include: { closedBy: true },
          orderBy: { date: 'desc' },
        });
        return list.map((c) => ({
          ...c,
          date: c.date.toISOString().split('T')[0],
          closedByName: c.closedBy?.name,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        }));
      } catch {
        const local = readDbJson();
        let list: any[] = local.dailyCounters || [];
        if (machineId) list = list.filter((c: any) => c.machineId === machineId);
        return list.map((c: any) => ({
          ...c,
          date: (c.date || '').split('T')[0],
          closedByName: c.closedByName || 'Owner (Print Bazzar)',
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
        }));
      }
    },
  },

  // --- NOTIFICATIONS ---
  notifications: {
    list: async () => {
      try {
        const list = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
        return list.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }));
      } catch {
        return [];
      }
    },
    markRead: async (id: string) => {
      try {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      } catch {}
    },
  },

  // --- AUDIT LOGS ---
  auditLogs: {
    list: async (limit = 100) => {
      try {
        const list = await prisma.auditLog.findMany({
          include: { user: true },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        return list.map((a) => ({
          ...a,
          userName: a.user.name,
          timestamp: a.timestamp.toISOString(),
        }));
      } catch {
        return [];
      }
    },
  },
};
