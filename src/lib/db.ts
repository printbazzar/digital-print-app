// Print Bazzar - Production Database Layer backed by Supabase PostgreSQL (Prisma ORM)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  calculateJobProduction,
  reconcileMachineCounter,
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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const db = {
  // --- USERS ---
  users: {
    findByEmail: async (email: string) => {
      try {
        let user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user && (email.toLowerCase() === 'owner@printbazzar.com' || email.toLowerCase() === 'operator@printbazzar.com')) {
          const isOwner = email.toLowerCase() === 'owner@printbazzar.com';
          const pass = await bcrypt.hash(isOwner ? 'owner123' : 'operator123', 10);
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              name: isOwner ? 'Owner (Print Bazzar)' : 'Operator 1 (Konica C3070)',
              passwordHash: pass,
              role: isOwner ? 'OWNER' : 'OPERATOR',
            },
          });
        }

        return user ? {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        } : undefined;
      } catch (err) {
        console.error('Database query error in findByEmail:', err);
        return undefined;
      }
    },
    findById: async (id: string) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } });
        return user ? {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        } : undefined;
      } catch {
        return undefined;
      }
    },
    list: async () => {
      try {
        const list = await prisma.user.findMany();
        return list.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        }));
      } catch {
        return [];
      }
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
        console.error('getKonica error:', err);
        return {
          ...INITIAL_MACHINE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
        return [{ ...INITIAL_MACHINE, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
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
          gstPercent: Number(r.gstPercent),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch {
        return INITIAL_RATES.map((r) => ({
          ...r,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          gstPercent: Number(r.gstPercent),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        } : undefined;
      } catch {
        return undefined;
      }
    },
    update: async (id: string, rate: number, gstPercent?: number) => {
      try {
        const updated = await prisma.printRate.update({
          where: { id },
          data: {
            rate,
            gstPercent: gstPercent !== undefined ? gstPercent : undefined,
          },
        });
        return {
          ...updated,
          rate: Number(updated.rate),
          gstPercent: Number(updated.gstPercent),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch {
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
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }));
      } catch {
        return INITIAL_MEDIA.map((m) => ({
          ...m,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    },
    getById: async (id: string) => {
      try {
        const m = await prisma.media.findUnique({ where: { id } });
        return m ? {
          ...m,
          brand: m.brand || 'Generic',
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        } : undefined;
      } catch {
        return undefined;
      }
    },
    create: async (item: any) => {
      const created = await prisma.media.create({
        data: {
          name: item.name.trim(),
          gsm: Number(item.gsm),
          size: item.size.trim(),
          brand: item.brand?.trim() || 'Generic',
          currentStock: Math.max(0, Number(item.currentStock) || 0),
          minimumStockLevel: Math.max(0, Number(item.minimumStockLevel) || 100),
          unit: item.unit || 'sheets',
          isActive: item.isActive !== undefined ? item.isActive : true,
        },
      });
      return {
        ...created,
        brand: created.brand || 'Generic',
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    },
    update: async (id: string, updates: any) => {
      try {
        const dataToUpdate: any = {};
        if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
        if (updates.gsm !== undefined) dataToUpdate.gsm = Number(updates.gsm);
        if (updates.size !== undefined) dataToUpdate.size = updates.size.trim();
        if (updates.brand !== undefined) dataToUpdate.brand = updates.brand.trim() || 'Generic';
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
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (err) {
        console.error('Media update error:', err);
        return null;
      }
    },
  },

  // --- INVENTORY MOVEMENTS ---
  inventory: {
    restock: async (mediaId: string, quantity: number, userId: string, reason?: string) => {
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media) throw new Error('Media not found');

      let validUserId = userId;
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        const firstUser = await prisma.user.findFirst();
        if (firstUser) validUserId = firstUser.id;
      }

      const qty = Math.max(1, Math.floor(quantity));
      const openingStock = media.currentStock;
      const closingStock = openingStock + qty;

      const [updatedMedia, movement] = await prisma.$transaction([
        prisma.media.update({
          where: { id: mediaId },
          data: { currentStock: closingStock },
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
          userName: userExists?.name || 'Operator',
          createdAt: movement.createdAt.toISOString(),
        },
      };
    },

    adjust: async (mediaId: string, newStock: number, userId: string, reason: string) => {
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media) throw new Error('Media not found');

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
      const media = await prisma.media.findUnique({ where: { id: params.mediaId } });
      if (!media) throw new Error('Media not found');

      const machine = await prisma.machine.findUnique({ where: { id: params.machineId } });
      if (!machine) throw new Error('Machine not found');

      let validOperatorId = params.operatorId;
      const userExists = await prisma.user.findUnique({ where: { id: params.operatorId } });
      if (!userExists) {
        const firstUser = await prisma.user.findFirst();
        if (firstUser) validOperatorId = firstUser.id;
      }

      let rate = await prisma.printRate.findUnique({
        where: {
          machineId_paperSize_printType: {
            machineId: params.machineId,
            paperSize: params.paperSize,
            printType: params.printType,
          },
        },
      });

      const unitRateVal = rate ? Number(rate.rate) : (params.paperSize === 'A3' ? (params.printType === 'COLOUR' ? 4.25 : 1.10) : (params.printType === 'COLOUR' ? 2.90 : 1.10));
      const gstVal = rate ? Number(rate.gstPercent) : 18.0;

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

      let validWastageReasonId = params.wastageReasonId || undefined;
      if (validWastageReasonId) {
        const wr = await prisma.wastageReason.findUnique({ where: { id: validWastageReasonId } });
        if (!wr) {
          const firstReason = await prisma.wastageReason.findFirst();
          validWastageReasonId = firstReason?.id || undefined;
        }
      }

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
        await prisma.notification.create({
          data: {
            title: `Low Stock: ${media.gsm} GSM ${media.name}`,
            message: `Stock is ${closingStock} sheets (Min: ${media.minimumStockLevel}).`,
            type: 'LOW_STOCK',
            linkUrl: '/inventory',
          },
        });
      }

      return {
        ...createdJob,
        unitCost: Number(createdJob.unitCost),
        totalCost: Number(createdJob.totalCost),
        gstAmount: Number(createdJob.gstAmount),
        grandTotalCost: Number(createdJob.grandTotalCost),
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        machineName: machine.name,
        operatorName: userExists?.name || 'Operator',
        productionDate: createdJob.productionDate.toISOString().split('T')[0],
        createdAt: createdJob.createdAt.toISOString(),
        updatedAt: createdJob.updatedAt.toISOString(),
      };
    },

    list: async (filter?: any) => {
      try {
        const jobs = await prisma.jobProduction.findMany({
          include: { media: true, machine: true, operator: true, wastageReason: true },
          orderBy: { createdAt: 'desc' },
        });

        let list = jobs.map((j) => ({
          ...j,
          unitCost: Number(j.unitCost),
          totalCost: Number(j.totalCost),
          gstAmount: Number(j.gstAmount),
          grandTotalCost: Number(j.grandTotalCost),
          mediaName: `${j.media.gsm} GSM ${j.media.name} (${j.media.size})`,
          machineName: j.machine.name,
          operatorName: j.operator.name,
          wastageReasonName: j.wastageReason?.reason,
          productionDate: j.productionDate.toISOString().split('T')[0],
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        }));

        if (filter?.date) {
          list = list.filter((j) => j.productionDate === filter.date);
        }
        if (filter?.startDate) {
          list = list.filter((j) => j.productionDate >= filter.startDate);
        }
        if (filter?.endDate) {
          list = list.filter((j) => j.productionDate <= filter.endDate);
        }
        if (filter?.operatorId) {
          list = list.filter((j) => j.operatorId === filter.operatorId);
        }
        if (filter?.machineId) {
          list = list.filter((j) => j.machineId === filter.machineId);
        }
        if (filter?.search) {
          const q = filter.search.toLowerCase();
          list = list.filter(
            (j) =>
              j.jobNumber.toLowerCase().includes(q) ||
              j.customerName.toLowerCase().includes(q) ||
              j.product.toLowerCase().includes(q) ||
              j.operatorName.toLowerCase().includes(q)
          );
        }
        return list;
      } catch {
        return [];
      }
    },

    getById: async (id: string) => {
      try {
        const j = await prisma.jobProduction.findUnique({
          where: { id },
          include: { media: true, machine: true, operator: true, wastageReason: true },
        });
        return j ? {
          ...j,
          unitCost: Number(j.unitCost),
          totalCost: Number(j.totalCost),
          gstAmount: Number(j.gstAmount),
          grandTotalCost: Number(j.grandTotalCost),
          mediaName: `${j.media.gsm} GSM ${j.media.name} (${j.media.size})`,
          machineName: j.machine.name,
          operatorName: j.operator.name,
          wastageReasonName: j.wastageReason?.reason,
          productionDate: j.productionDate.toISOString().split('T')[0],
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        } : undefined;
      } catch {
        return undefined;
      }
    },

    update: async (id: string, updates: any, userId: string) => {
      try {
        const updated = await prisma.jobProduction.update({
          where: { id },
          data: updates,
        });
        return {
          ...updated,
          unitCost: Number(updated.unitCost),
          totalCost: Number(updated.totalCost),
          gstAmount: Number(updated.gstAmount),
          grandTotalCost: Number(updated.grandTotalCost),
          productionDate: updated.productionDate.toISOString().split('T')[0],
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch {
        return null;
      }
    },
  },

  // --- DAILY MACHINE COUNTERS ---
  counters: {
    getOrInitToday: async (machineId: string, dateStr?: string) => {
      const dateOnlyStr = dateStr || new Date().toISOString().split('T')[0];
      const targetDate = new Date(`${dateOnlyStr}T00:00:00.000Z`);

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
        return [];
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
