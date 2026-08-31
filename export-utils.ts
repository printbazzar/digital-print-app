// Export Utilities for PDF and Excel Reports
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ReportData {
  period: { key: string; startDate: string; endDate: string };
  summary: {
    totalJobs: number;
    totalGoodPrints: number;
    totalWastage: number;
    totalReprint: number;
    totalSheetConsumption: number;
    totalClicks: number;
    wastagePercentage: number;
    totalColourClicks: number;
    totalBWClicks: number;
    totalA4Clicks: number;
    totalA3Clicks: number;
    totalSingleSide: number;
    totalDoubleSide: number;
    totalCost: number;
    grandTotalCost: number;
  };
  operatorReport: Array<{
    name: string;
    jobs: number;
    good: number;
    wastage: number;
    wastagePct: number;
    clicks: number;
    cost: number;
  }>;
  mediaReport: Array<{
    name: string;
    sheets: number;
    jobs: number;
  }>;
  wastageReport: Array<{
    reason: string;
    quantity: number;
    percentage: number;
  }>;
  jobs: any[];
}

export function exportToExcel(data: ReportData, filenamePrefix = 'Print_Bazzar_Production_Report') {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryRows = [
    ['PRINT BAZZAR - DIGITAL PRINTING PRODUCTION REPORT'],
    ['Konica Minolta C3070 Press'],
    ['Period:', `${data.period.startDate} to ${data.period.endDate}`],
    [],
    ['METRIC', 'VALUE'],
    ['Total Jobs Produced', data.summary.totalJobs],
    ['Total Good Prints', data.summary.totalGoodPrints],
    ['Total Wastage Sheets', data.summary.totalWastage],
    ['Wastage Percentage', `${data.summary.wastagePercentage}%`],
    ['Total Reprint Sheets', data.summary.totalReprint],
    ['Total Sheets Consumed', data.summary.totalSheetConsumption],
    ['Total Machine Clicks', data.summary.totalClicks],
    ['Colour Clicks', data.summary.totalColourClicks],
    ['B&W Clicks', data.summary.totalBWClicks],
    ['A4 Clicks', data.summary.totalA4Clicks],
    ['A3 Clicks', data.summary.totalA3Clicks],
    ['Single-Side Sheets', data.summary.totalSingleSide],
    ['Double-Side Sheets', data.summary.totalDoubleSide],
    ['Total Production Cost (Excl. GST)', `INR ${data.summary.totalCost}`],
    ['Grand Total Cost (Incl. 18% GST)', `INR ${data.summary.grandTotalCost}`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Operator Breakdown
  const operatorRows = [
    ['Operator Name', 'Jobs Count', 'Good Prints', 'Wastage Sheets', 'Wastage %', 'Total Machine Clicks', 'Total Cost (INR)'],
    ...data.operatorReport.map((op) => [
      op.name,
      op.jobs,
      op.good,
      op.wastage,
      `${op.wastagePct}%`,
      op.clicks,
      op.cost,
    ]),
  ];
  const wsOperator = XLSX.utils.aoa_to_sheet(operatorRows);
  XLSX.utils.book_append_sheet(wb, wsOperator, 'Operator Breakdown');

  // 3. Media Consumption
  const mediaRows = [
    ['Media / Paper Specification', 'Total Sheets Used', 'Jobs Count'],
    ...data.mediaReport.map((m) => [m.name, m.sheets, m.jobs]),
  ];
  const wsMedia = XLSX.utils.aoa_to_sheet(mediaRows);
  XLSX.utils.book_append_sheet(wb, wsMedia, 'Media Consumption');

  // 4. Wastage Breakdown
  const wastageRows = [
    ['Wastage Reason', 'Quantity (Sheets)', 'Percentage of Total Wastage'],
    ...data.wastageReport.map((w) => [w.reason, w.quantity, `${w.percentage}%`]),
  ];
  const wsWastage = XLSX.utils.aoa_to_sheet(wastageRows);
  XLSX.utils.book_append_sheet(wb, wsWastage, 'Wastage Breakdown');

  // 5. Detailed Jobs Sheet
  const jobRows = [
    [
      'Job Number',
      'Date',
      'Customer',
      'Product',
      'Media',
      'Size',
      'Type',
      'Side',
      'Good',
      'Wastage',
      'Reprint',
      'Sheets Used',
      'Clicks',
      'Cost (INR)',
      'Operator',
      'Wastage Reason',
    ],
    ...data.jobs.map((j) => [
      j.jobNumber,
      j.productionDate,
      j.customerName,
      j.product,
      j.mediaName,
      j.paperSize,
      j.printType,
      j.printSide,
      j.goodPrints,
      j.wastage,
      j.reprint,
      j.sheetConsumption,
      j.machineClicks,
      j.grandTotalCost,
      j.operatorName,
      j.wastageReasonName || j.wastageReasonOther || '-',
    ]),
  ];
  const wsJobs = XLSX.utils.aoa_to_sheet(jobRows);
  XLSX.utils.book_append_sheet(wb, wsJobs, 'All Production Jobs');

  XLSX.writeFile(wb, `${filenamePrefix}_${data.period.startDate}_to_${data.period.endDate}.xlsx`);
}

export function exportToPDF(data: ReportData, filenamePrefix = 'Print_Bazzar_Production_Report') {
  const doc = new jsPDF('landscape');

  // Title Banner
  doc.setFontSize(18);
  doc.setTextColor(20, 83, 45); // brand dark green
  doc.text('PRINT BAZZAR — DIGITAL PRINTING PRODUCTION REPORT', 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Primary Press: Konica Minolta C3070  |  Period: ${data.period.startDate} to ${data.period.endDate}`, 14, 22);
  doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 27);

  // Key KPI Summary Table
  const summaryBody = [
    [
      `Total Jobs: ${data.summary.totalJobs}`,
      `Total Clicks: ${data.summary.totalClicks}`,
      `Sheets Used: ${data.summary.totalSheetConsumption}`,
      `Good Prints: ${data.summary.totalGoodPrints}`,
    ],
    [
      `Colour Clicks: ${data.summary.totalColourClicks}`,
      `B&W Clicks: ${data.summary.totalBWClicks}`,
      `Wastage: ${data.summary.totalWastage} (${data.summary.wastagePercentage}%)`,
      `Total Cost: INR ${data.summary.grandTotalCost}`,
    ],
  ];

  (doc as any).autoTable({
    startY: 32,
    body: summaryBody,
    theme: 'grid',
    styles: { fontSize: 9, fontStyle: 'bold', fillColor: [240, 253, 244] },
  });

  // Detailed Jobs Table
  const tableColumns = [
    'Job #',
    'Date',
    'Customer',
    'Product',
    'Media',
    'Size',
    'Type',
    'Side',
    'Good',
    'Wst',
    'Sheets',
    'Clicks',
    'Total (INR)',
    'Operator',
  ];

  const tableRows = data.jobs.map((j) => [
    j.jobNumber,
    j.productionDate,
    j.customerName,
    j.product,
    j.mediaName ? j.mediaName.substring(0, 18) : '-',
    j.paperSize,
    j.printType,
    j.printSide === 'DOUBLE' ? '2-Side' : '1-Side',
    j.goodPrints,
    j.wastage,
    j.sheetConsumption,
    j.machineClicks,
    `INR ${j.grandTotalCost}`,
    j.operatorName || 'Operator',
  ]);

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [tableColumns],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold' },
    },
  });

  doc.save(`${filenamePrefix}_${data.period.startDate}_to_${data.period.endDate}.pdf`);
}
