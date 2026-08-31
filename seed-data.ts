// Seed Data Constants for Print Bazzar Digital Printing Production System
import bcrypt from 'bcryptjs';

export const INITIAL_MACHINE = {
  id: 'mach-c3070-001',
  name: 'Konica Minolta C3070',
  model: 'AccurioPress C3070',
  department: 'Digital Printing Production',
  initialCounter: 1067426,
  currentCounter: 1067426,
  isActive: true,
};

export const INITIAL_RATES = [
  {
    id: 'rate-a4-colour',
    machineId: 'mach-c3070-001',
    paperSize: 'A4',
    printType: 'COLOUR',
    rate: 2.90,
    gstPercent: 18.0,
    isActive: true,
  },
  {
    id: 'rate-a4-bw',
    machineId: 'mach-c3070-001',
    paperSize: 'A4',
    printType: 'BW',
    rate: 1.10,
    gstPercent: 18.0,
    isActive: true,
  },
  {
    id: 'rate-a3-colour',
    machineId: 'mach-c3070-001',
    paperSize: 'A3',
    printType: 'COLOUR',
    rate: 4.25,
    gstPercent: 18.0,
    isActive: true,
  },
  {
    id: 'rate-a3-bw',
    machineId: 'mach-c3070-001',
    paperSize: 'A3',
    printType: 'BW',
    rate: 1.10,
    gstPercent: 18.0,
    isActive: true,
  },
];

export const INITIAL_WASTAGE_REASONS = [
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

export const INITIAL_MEDIA = [
  { id: 'med-1', name: 'Maplitho', gsm: 80, size: '13x19', brand: 'Century', currentStock: 2500, minimumStockLevel: 500 },
  { id: 'med-2', name: 'Maplitho', gsm: 100, size: '13x19', brand: 'Century', currentStock: 2000, minimumStockLevel: 500 },
  { id: 'med-3', name: 'Bond Sheet', gsm: 80, size: '13x19', brand: 'Bilt', currentStock: 1800, minimumStockLevel: 500 },
  { id: 'med-4', name: 'Bond Sheet', gsm: 100, size: '13x19', brand: 'Bilt', currentStock: 1500, minimumStockLevel: 500 },
  { id: 'med-5', name: 'Art Paper', gsm: 100, size: '13x19', brand: 'Century', currentStock: 3000, minimumStockLevel: 500 },
  { id: 'med-6', name: 'Art Paper', gsm: 130, size: '13x19', brand: 'Century', currentStock: 2800, minimumStockLevel: 500 },
  { id: 'med-7', name: 'Art Paper', gsm: 170, size: '13x19', brand: 'Century', currentStock: 2500, minimumStockLevel: 500 },
  { id: 'med-8', name: 'Art Board', gsm: 250, size: '13x19', brand: 'ITC Cyber XL', currentStock: 1200, minimumStockLevel: 300 },
  { id: 'med-9', name: 'Art Board', gsm: 300, size: '13x19', brand: 'ITC Cyber XL', currentStock: 1500, minimumStockLevel: 300 },
  { id: 'med-10', name: 'Art Board', gsm: 350, size: '13x19', brand: 'ITC Cyber XL', currentStock: 800, minimumStockLevel: 200 },
  { id: 'med-11', name: 'Synthetic Sheet', gsm: 125, size: '13x19', brand: 'Generic', currentStock: 600, minimumStockLevel: 200 },
  { id: 'med-12', name: 'Synthetic Sheet', gsm: 200, size: '13x19', brand: 'Generic', currentStock: 500, minimumStockLevel: 200 },
  { id: 'med-13', name: 'Gold Metallic Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 350, minimumStockLevel: 100 },
  { id: 'med-14', name: 'Art Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 900, minimumStockLevel: 200 },
  { id: 'med-15', name: 'PVC White Sticker', gsm: 180, size: '13x19', brand: 'Generic', currentStock: 450, minimumStockLevel: 150 },
  { id: 'med-16', name: 'Transparent Clear Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 400, minimumStockLevel: 150 },
  { id: 'med-17', name: 'Linen White Texture', gsm: 280, size: '13x19', brand: 'Fedrigoni', currentStock: 250, minimumStockLevel: 100 },
  { id: 'med-18', name: 'Needle Point Texture', gsm: 280, size: '13x19', brand: 'Fedrigoni', currentStock: 200, minimumStockLevel: 100 },
  { id: 'med-19', name: 'Silver Metallic Sticker', gsm: 150, size: '13x19', brand: 'Generic', currentStock: 300, minimumStockLevel: 100 },
  { id: 'med-20', name: 'Metallic Board Silver', gsm: 300, size: '13x19', brand: 'Generic', currentStock: 220, minimumStockLevel: 100 },
  { id: 'med-21', name: 'Metallic Board Gold', gsm: 300, size: '13x19', brand: 'Generic', currentStock: 240, minimumStockLevel: 100 },
];

export function getInitialUsers() {
  return [
    {
      id: 'usr-owner-001',
      email: 'owner@printbazzar.com',
      name: 'Owner (Print Bazzar)',
      passwordHash: bcrypt.hashSync('owner123', 10),
      role: 'OWNER',
      isActive: true,
    },
    {
      id: 'usr-operator-001',
      email: 'operator@printbazzar.com',
      name: 'Operator 1 (Konica C3070)',
      passwordHash: bcrypt.hashSync('operator123', 10),
      role: 'OPERATOR',
      isActive: true,
    },
  ];
}
