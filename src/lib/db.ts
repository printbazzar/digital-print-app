// Print Bazzar - Database & Persistence Layer
import fs from 'fs';
import path from 'path';
import {
  INITIAL_MACHINE,
  INITIAL_RATES,
  INITIAL_WASTAGE_REASONS,
  INITIAL_MEDIA,
  getInitialUsers,
} from './seed-data';
import {
  calculateJobProduction,
  reconcileMachineCounter,
  PrintSide,
  PaperSize,
  PrintType,
} from './calculations';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'OWNER' | 'OPERATOR';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MachineEntity {
  id: string;
  name: string;
  model: string;
  department: string;
  initialCounter: number;
  currentCounter: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrintRateEntity {
  id: string;
  machineId: string;
  paperSize: 'A4' | 'A3';
  printType: 'COLOUR' | 'BW';
  rate: number;
  gstPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaEntity {
  id: string;
  name: string;
  gsm: number;
  size: string;
  brand?: string;
  currentStock: number;
  minimumStockLevel: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovementEntity {
  id: string;
  mediaId: string;
  mediaName?: string;
  quantity: number;
  openingStock: number;
  closingStock: number;
  movementType: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_ADJUSTMENT';
  referenceId?: string;
  reason?: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

export interface WastageReasonEntity {
  id: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
}

export interface JobProductionEntity {
  id: string;
  jobNumber: string;
  customerName: string;
  product: string;
  orderedQuantity: number;
  printType: 'COLOUR' | 'BW';
  paperSize: 'A4' | 'A3';
  printSide: 'SINGLE' | 'DOUBLE';
  mediaId: string;
  mediaName?: string;
  machineId: string;
  machineName?: string;
  goodPrints: number;
  wastage: number;
  reprint: number;
  reprintType?: 'PRODUCTION_REPRINT' | 'CUSTOMER_ADDITIONAL';
  sheetConsumption: number;
  machineClicks: number;
  unitCost: number;
  totalCost: number;
  gstAmount: number;
  grandTotalCost: number;
  wastageReasonId?: string;
  wastageReasonName?: string;
  wastageReasonOther?: string;
  wastagePhotoUrl?: string;
  remarks?: string;
  operatorId: string;
  operatorName?: string;
  productionDate: string; // YYYY-MM-DD
  dailyCounterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMachineCounterEntity {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  openingCounter: number;
  closingCounter?: number;
  machinePrintCount?: number;
  totalJobClicks: number;
  difference: number;
  isMatched: boolean;
  mismatchReason?: string;
  isClosed: boolean;
  closedById?: string;
  closedByName?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEntity {
  id: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'COUNTER_MISMATCH' | 'DAY_CLOSURE' | 'SYSTEM';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AuditLogEntity {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: UserEntity[];
  machines: MachineEntity[];
  rates: PrintRateEntity[];
  media: MediaEntity[];
  inventoryMovements: InventoryMovementEntity[];
  wastageReasons: WastageReasonEntity[];
  jobs: JobProductionEntity[];
  dailyCounters: DailyMachineCounterEntity[];
  notifications: NotificationEntity[];
  auditLogs: AuditLogEntity[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    users: getInitialUsers().map((u) => ({
      ...u,
      role: u.role as 'OWNER' | 'OPERATOR',
      createdAt: now,
      updatedAt: now,
    })),
    machines: [
      {
        ...INITIAL_MACHINE,
        createdAt: now,
        updatedAt: now,
      },
    ],
    rates: INITIAL_RATES.map((r) => ({
      ...r,
      paperSize: r.paperSize as 'A4' | 'A3',
      printType: r.printType as 'COLOUR' | 'BW',
      createdAt: now,
      updatedAt: now,
    })),
    media: INITIAL_MEDIA.map((m) => ({
      ...m,
      unit: 'sheets',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
    inventoryMovements: [],
    wastageReasons: INITIAL_WASTAGE_REASONS.map((wr) => ({
      ...wr,
      createdAt: now,
    })),
    jobs: [],
    dailyCounters: [],
    notifications: [],
    auditLogs: [],
  };
}

function loadDatabase(): DatabaseSchema {
  ensureDataDirectory();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = getInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data;
  } catch (error) {
    console.error('Error reading db.json, reinitializing:', error);
    const initial = getInitialDatabase();
    saveDatabase(initial);
    return initial;
  }
}

function saveDatabase(data: DatabaseSchema): void {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  // --- USERS ---
  users: {
    findByEmail: async (email: string): Promise<UserEntity | undefined> => {
      const data = loadDatabase();
      return data.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.isActive
      );
    },
    findById: async (id: string): Promise<UserEntity | undefined> => {
      const data = loadDatabase();
      return data.users.find((u) => u.id === id);
    },
    list: async (): Promise<UserEntity[]> => {
      const data = loadDatabase();
      return data.users;
    },
  },

  // --- MACHINES ---
  machines: {
    getKonica: async (): Promise<MachineEntity> => {
      const data = loadDatabase();
      let mach = data.machines.find((m) => m.name.includes('Konica'));
      if (!mach) {
        mach = {
          ...INITIAL_MACHINE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.machines.push(mach);
        saveDatabase(data);
      }
      return mach;
    },
    list: async (): Promise<MachineEntity[]> => {
      const data = loadDatabase();
      return data.machines;
    },
    update: async (
      id: string,
      updates: Partial<MachineEntity>
    ): Promise<MachineEntity | null> => {
      const data = loadDatabase();
      const index = data.machines.findIndex((m) => m.id === id);
      if (index === -1) return null;
      data.machines[index] = {
        ...data.machines[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(data);
      return data.machines[index];
    },
  },

  // --- PRINT RATES ---
  rates: {
    list: async (machineId?: string): Promise<PrintRateEntity[]> => {
      const data = loadDatabase();
      if (machineId) {
        return data.rates.filter((r) => r.machineId === machineId);
      }
      return data.rates;
    },
    find: async (
      machineId: string,
      paperSize: PaperSize,
      printType: PrintType
    ): Promise<PrintRateEntity | undefined> => {
      const data = loadDatabase();
      return data.rates.find(
        (r) =>
          r.machineId === machineId &&
          r.paperSize === paperSize &&
          r.printType === printType &&
          r.isActive
      );
    },
    update: async (
      id: string,
      rate: number,
      gstPercent?: number
    ): Promise<PrintRateEntity | null> => {
      const data = loadDatabase();
      const index = data.rates.findIndex((r) => r.id === id);
      if (index === -1) return null;
      data.rates[index] = {
        ...data.rates[index],
        rate: Number(rate),
        gstPercent: gstPercent !== undefined ? Number(gstPercent) : data.rates[index].gstPercent,
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(data);
      return data.rates[index];
    },
  },

  // --- MEDIA & INVENTORY ---
  media: {
    list: async (): Promise<MediaEntity[]> => {
      const data = loadDatabase();
      return data.media.filter((m) => m.isActive);
    },
    getById: async (id: string): Promise<MediaEntity | undefined> => {
      const data = loadDatabase();
      return data.media.find((m) => m.id === id);
    },
    create: async (item: Omit<MediaEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<MediaEntity> => {
      const data = loadDatabase();
      const newMedia: MediaEntity = {
        ...item,
        id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.media.push(newMedia);
      saveDatabase(data);
      return newMedia;
    },
    update: async (id: string, updates: Partial<MediaEntity>): Promise<MediaEntity | null> => {
      const data = loadDatabase();
      const index = data.media.findIndex((m) => m.id === id);
      if (index === -1) return null;
      data.media[index] = {
        ...data.media[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(data);
      return data.media[index];
    },
  },

  // --- INVENTORY MOVEMENTS ---
  inventory: {
    restock: async (
      mediaId: string,
      quantity: number,
      userId: string,
      reason?: string
    ): Promise<{ media: MediaEntity; movement: InventoryMovementEntity }> => {
      const data = loadDatabase();
      const media = data.media.find((m) => m.id === mediaId);
      if (!media) throw new Error('Media item not found');

      const user = data.users.find((u) => u.id === userId);
      const qty = Math.max(1, Math.floor(quantity));
      const openingStock = media.currentStock;
      const closingStock = openingStock + qty;

      media.currentStock = closingStock;
      media.updatedAt = new Date().toISOString();

      const movement: InventoryMovementEntity = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        mediaId,
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        quantity: qty,
        openingStock,
        closingStock,
        movementType: 'STOCK_IN',
        reason: reason || 'Restock purchase',
        userId,
        userName: user?.name || 'Operator',
        createdAt: new Date().toISOString(),
      };

      data.inventoryMovements.push(movement);
      saveDatabase(data);
      return { media, movement };
    },

    adjust: async (
      mediaId: string,
      newStock: number,
      userId: string,
      reason: string
    ): Promise<{ media: MediaEntity; movement: InventoryMovementEntity }> => {
      const data = loadDatabase();
      const media = data.media.find((m) => m.id === mediaId);
      if (!media) throw new Error('Media item not found');

      const user = data.users.find((u) => u.id === userId);
      const targetStock = Math.max(0, Math.floor(newStock));
      const openingStock = media.currentStock;
      const quantityDiff = targetStock - openingStock;

      media.currentStock = targetStock;
      media.updatedAt = new Date().toISOString();

      const movement: InventoryMovementEntity = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        mediaId,
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        quantity: quantityDiff,
        openingStock,
        closingStock: targetStock,
        movementType: 'STOCK_ADJUSTMENT',
        reason: reason || 'Manual Stock Adjustment',
        userId,
        userName: user?.name || 'Owner',
        createdAt: new Date().toISOString(),
      };

      data.inventoryMovements.push(movement);
      saveDatabase(data);
      return { media, movement };
    },

    listMovements: async (mediaId?: string): Promise<InventoryMovementEntity[]> => {
      const data = loadDatabase();
      let list = data.inventoryMovements;
      if (mediaId) {
        list = list.filter((m) => m.mediaId === mediaId);
      }
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  },

  // --- WASTAGE REASONS ---
  wastageReasons: {
    list: async (): Promise<WastageReasonEntity[]> => {
      const data = loadDatabase();
      return data.wastageReasons.filter((wr) => wr.isActive);
    },
    create: async (reason: string): Promise<WastageReasonEntity> => {
      const data = loadDatabase();
      const newWr: WastageReasonEntity = {
        id: `wr-${Date.now()}`,
        reason: reason.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      data.wastageReasons.push(newWr);
      saveDatabase(data);
      return newWr;
    },
  },

  // --- JOBS & PRODUCTION ---
  jobs: {
    create: async (params: {
      jobNumber: string;
      customerName: string;
      product: string;
      orderedQuantity: number;
      printType: 'COLOUR' | 'BW';
      paperSize: 'A4' | 'A3';
      printSide: 'SINGLE' | 'DOUBLE';
      mediaId: string;
      machineId: string;
      goodPrints: number;
      wastage?: number;
      reprint?: number;
      reprintType?: 'PRODUCTION_REPRINT' | 'CUSTOMER_ADDITIONAL';
      wastageReasonId?: string;
      wastageReasonOther?: string;
      wastagePhotoUrl?: string;
      remarks?: string;
      operatorId: string;
      productionDate?: string; // YYYY-MM-DD
    }): Promise<JobProductionEntity> => {
      const data = loadDatabase();
      const media = data.media.find((m) => m.id === params.mediaId);
      if (!media) throw new Error('Selected media does not exist');

      const machine = data.machines.find((m) => m.id === params.machineId);
      if (!machine) throw new Error('Selected machine does not exist');

      const operator = data.users.find((u) => u.id === params.operatorId);
      const rate = data.rates.find(
        (r) =>
          r.machineId === params.machineId &&
          r.paperSize === params.paperSize &&
          r.printType === params.printType &&
          r.isActive
      );
      if (!rate) throw new Error('Active print rate not configured for selected machine/size/type');

      // Authoritative calculation
      const calc = calculateJobProduction({
        goodPrints: params.goodPrints,
        wastage: params.wastage || 0,
        reprint: params.reprint || 0,
        printSide: params.printSide,
        unitRate: rate.rate,
        gstPercent: rate.gstPercent,
      });

      // Stock Check
      if (media.currentStock < calc.sheetConsumption) {
        throw new Error(
          `INSUFFICIENT STOCK: Media '${media.name}' has ${media.currentStock} sheets, but job requires ${calc.sheetConsumption} sheets.`
        );
      }

      // Deduct inventory
      const openingStock = media.currentStock;
      const closingStock = openingStock - calc.sheetConsumption;
      media.currentStock = closingStock;
      media.updatedAt = new Date().toISOString();

      // Record inventory movement
      const movement: InventoryMovementEntity = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        mediaId: media.id,
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        quantity: -calc.sheetConsumption,
        openingStock,
        closingStock,
        movementType: 'STOCK_OUT',
        referenceId: params.jobNumber,
        reason: `Production for Job #${params.jobNumber} (${params.customerName})`,
        userId: params.operatorId,
        userName: operator?.name || 'Operator',
        createdAt: new Date().toISOString(),
      };
      data.inventoryMovements.push(movement);

      // Low Stock Alert Check
      if (closingStock <= media.minimumStockLevel) {
        const notif: NotificationEntity = {
          id: `notif-${Date.now()}`,
          title: `Low Stock Alert: ${media.gsm} GSM ${media.name}`,
          message: `Current stock is ${closingStock} sheets (Minimum threshold: ${media.minimumStockLevel} sheets).`,
          type: 'LOW_STOCK',
          isRead: false,
          linkUrl: '/inventory',
          createdAt: new Date().toISOString(),
        };
        data.notifications.push(notif);
      }

      const wastageReason = data.wastageReasons.find(
        (wr) => wr.id === params.wastageReasonId
      );

      const productionDate =
        params.productionDate || new Date().toISOString().split('T')[0];

      const job: JobProductionEntity = {
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        jobNumber: params.jobNumber.trim(),
        customerName: params.customerName.trim(),
        product: params.product.trim(),
        orderedQuantity: Math.max(1, Math.floor(params.orderedQuantity)),
        printType: params.printType,
        paperSize: params.paperSize,
        printSide: params.printSide,
        mediaId: params.mediaId,
        mediaName: `${media.gsm} GSM ${media.name} (${media.size})`,
        machineId: params.machineId,
        machineName: machine.name,
        goodPrints: Math.max(0, Math.floor(params.goodPrints)),
        wastage: Math.max(0, Math.floor(params.wastage || 0)),
        reprint: Math.max(0, Math.floor(params.reprint || 0)),
        reprintType: params.reprintType,
        sheetConsumption: calc.sheetConsumption,
        machineClicks: calc.machineClicks,
        unitCost: calc.unitCost,
        totalCost: calc.totalCost,
        gstAmount: calc.gstAmount,
        grandTotalCost: calc.grandTotalCost,
        wastageReasonId: params.wastageReasonId,
        wastageReasonName: wastageReason?.reason,
        wastageReasonOther: params.wastageReasonOther,
        wastagePhotoUrl: params.wastagePhotoUrl,
        remarks: params.remarks,
        operatorId: params.operatorId,
        operatorName: operator?.name || 'Operator',
        productionDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      data.jobs.push(job);

      // Audit Log
      data.auditLogs.push({
        id: `aud-${Date.now()}`,
        userId: params.operatorId,
        userName: operator?.name,
        action: 'JOB_CREATED',
        entity: 'JobProduction',
        entityId: job.id,
        newValue: {
          jobNumber: job.jobNumber,
          clicks: job.machineClicks,
          sheets: job.sheetConsumption,
        },
        timestamp: new Date().toISOString(),
      });

      saveDatabase(data);
      return job;
    },

    list: async (filter?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      operatorId?: string;
      machineId?: string;
      search?: string;
    }): Promise<JobProductionEntity[]> => {
      const data = loadDatabase();
      let list = data.jobs;

      if (filter?.date) {
        list = list.filter((j) => j.productionDate === filter.date);
      }
      if (filter?.startDate) {
        list = list.filter((j) => j.productionDate >= filter.startDate!);
      }
      if (filter?.endDate) {
        list = list.filter((j) => j.productionDate <= filter.endDate!);
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
            j.operatorName?.toLowerCase().includes(q)
        );
      }

      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    getById: async (id: string): Promise<JobProductionEntity | undefined> => {
      const data = loadDatabase();
      return data.jobs.find((j) => j.id === id);
    },

    update: async (
      id: string,
      updates: Partial<JobProductionEntity>,
      userId: string
    ): Promise<JobProductionEntity | null> => {
      const data = loadDatabase();
      const index = data.jobs.findIndex((j) => j.id === id);
      if (index === -1) return null;
      const oldVal = { ...data.jobs[index] };
      data.jobs[index] = {
        ...data.jobs[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const user = data.users.find((u) => u.id === userId);
      data.auditLogs.push({
        id: `aud-${Date.now()}`,
        userId,
        userName: user?.name,
        action: 'JOB_UPDATED',
        entity: 'JobProduction',
        entityId: id,
        oldValue: oldVal,
        newValue: data.jobs[index],
        timestamp: new Date().toISOString(),
      });

      saveDatabase(data);
      return data.jobs[index];
    },
  },

  // --- DAILY MACHINE COUNTER & DAY CLOSURE ---
  counters: {
    getOrInitToday: async (
      machineId: string,
      dateStr?: string
    ): Promise<{
      counter: DailyMachineCounterEntity;
      totalJobClicksToday: number;
    }> => {
      const data = loadDatabase();
      const date = dateStr || new Date().toISOString().split('T')[0];

      // Calculate total job clicks for this machine and date
      const todaysJobs = data.jobs.filter(
        (j) => j.machineId === machineId && j.productionDate === date
      );
      const totalJobClicksToday = todaysJobs.reduce(
        (acc, j) => acc + j.machineClicks,
        0
      );

      let counter = data.dailyCounters.find(
        (c) => c.machineId === machineId && c.date === date
      );

      if (!counter) {
        // Find previous closing counter
        const previousRecords = data.dailyCounters
          .filter((c) => c.machineId === machineId && c.date < date && c.closingCounter)
          .sort((a, b) => b.date.localeCompare(a.date));

        let openingCounter = INITIAL_MACHINE.initialCounter; // 1,067,426
        if (previousRecords.length > 0 && previousRecords[0].closingCounter) {
          openingCounter = previousRecords[0].closingCounter;
        }

        counter = {
          id: `dc-${Date.now()}`,
          machineId,
          date,
          openingCounter,
          totalJobClicks: totalJobClicksToday,
          difference: 0,
          isMatched: true,
          isClosed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        data.dailyCounters.push(counter);
        saveDatabase(data);
      } else {
        // Sync totalJobClicks if not closed
        if (!counter.isClosed) {
          counter.totalJobClicks = totalJobClicksToday;
          if (counter.closingCounter !== undefined) {
            const recon = reconcileMachineCounter({
              openingCounter: counter.openingCounter,
              closingCounter: counter.closingCounter,
              totalJobClicks: totalJobClicksToday,
            });
            counter.machinePrintCount = recon.machinePrintCount;
            counter.difference = recon.difference;
            counter.isMatched = recon.isMatched;
          }
          saveDatabase(data);
        }
      }

      return { counter, totalJobClicksToday };
    },

    closeDay: async (params: {
      machineId: string;
      date: string;
      closingCounter: number;
      mismatchReason?: string;
      userId: string;
    }): Promise<DailyMachineCounterEntity> => {
      const data = loadDatabase();
      const user = data.users.find((u) => u.id === params.userId);
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

      // Update machine current counter
      const machine = data.machines.find((m) => m.id === params.machineId);
      if (machine) {
        machine.currentCounter = closing;
        machine.updatedAt = new Date().toISOString();
      }

      // Update daily counter
      const dcIndex = data.dailyCounters.findIndex((c) => c.id === counter.id);
      const updated: DailyMachineCounterEntity = {
        ...data.dailyCounters[dcIndex],
        closingCounter: closing,
        machinePrintCount: recon.machinePrintCount,
        totalJobClicks: totalJobClicksToday,
        difference: recon.difference,
        isMatched: recon.isMatched,
        mismatchReason: params.mismatchReason?.trim() || undefined,
        isClosed: true,
        closedById: params.userId,
        closedByName: user?.name || 'Operator',
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      data.dailyCounters[dcIndex] = updated;

      // Audit Log
      data.auditLogs.push({
        id: `aud-${Date.now()}`,
        userId: params.userId,
        userName: user?.name,
        action: 'DAY_CLOSED',
        entity: 'DailyMachineCounter',
        entityId: updated.id,
        newValue: {
          opening: updated.openingCounter,
          closing: updated.closingCounter,
          machineClicks: updated.machinePrintCount,
          jobClicks: updated.totalJobClicks,
          difference: updated.difference,
          mismatchReason: updated.mismatchReason,
        },
        timestamp: new Date().toISOString(),
      });

      // Notification
      data.notifications.push({
        id: `notif-${Date.now()}`,
        title: `Day Closed (${params.date}): ${machine?.name}`,
        message: `Machine clicks: ${recon.machinePrintCount}, Job clicks: ${totalJobClicksToday}. ${
          recon.isMatched ? 'Matched successfully.' : `Mismatch of ${recon.difference} clicks recorded with reason: ${params.mismatchReason}`
        }`,
        type: 'DAY_CLOSURE',
        isRead: false,
        linkUrl: '/daily-closing',
        createdAt: new Date().toISOString(),
      });

      saveDatabase(data);
      return updated;
    },

    list: async (machineId?: string): Promise<DailyMachineCounterEntity[]> => {
      const data = loadDatabase();
      let list = data.dailyCounters;
      if (machineId) {
        list = list.filter((c) => c.machineId === machineId);
      }
      return list.sort((a, b) => b.date.localeCompare(a.date));
    },
  },

  // --- NOTIFICATIONS ---
  notifications: {
    list: async (): Promise<NotificationEntity[]> => {
      const data = loadDatabase();
      return data.notifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    markRead: async (id: string): Promise<void> => {
      const data = loadDatabase();
      const item = data.notifications.find((n) => n.id === id);
      if (item) {
        item.isRead = true;
        saveDatabase(data);
      }
    },
  },

  // --- AUDIT LOGS ---
  auditLogs: {
    list: async (limit = 100): Promise<AuditLogEntity[]> => {
      const data = loadDatabase();
      return data.auditLogs
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);
    },
  },
};
