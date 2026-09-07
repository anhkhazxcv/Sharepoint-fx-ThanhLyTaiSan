import type { IOrderDetail } from '../orderDetail/types';
import {
  buildTransactionExportRows,
  filterOrdersByDateRange,
  type ITransactionExportRow
} from '../orderDetail/utils/transactionExportUtils';

function formatDateForFileName(date?: Date): string {
  if (!date) {
    return 'tatca';
  }

  const day: string = ('0' + String(date.getDate())).slice(-2);
  const month: string = ('0' + String(date.getMonth() + 1)).slice(-2);
  const year: number = date.getFullYear();

  return day + month + String(year);
}

export async function exportTransactionsToExcel(orders: IOrderDetail[], fromDate?: Date, toDate?: Date): Promise<number> {
  const filteredOrders: IOrderDetail[] = filterOrdersByDateRange(orders, fromDate, toDate);
  const rows: ITransactionExportRow[] = buildTransactionExportRows(filteredOrders);

  const XLSX = await import(/* webpackChunkName: 'xlsx-export' */ 'xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Giao dich');

  const fileName: string = 'GiaoDich_' + formatDateForFileName(fromDate) + '_' + formatDateForFileName(toDate) + '.xlsx';
  XLSX.writeFile(workbook, fileName);

  return rows.length;
}
