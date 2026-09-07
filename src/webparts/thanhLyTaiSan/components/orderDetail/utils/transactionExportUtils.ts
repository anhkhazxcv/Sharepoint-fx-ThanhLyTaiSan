import type { IOrderDetail, IOrderItem } from '../types';
import { formatDate } from './format';

export interface ITransactionExportRow {
  'Mã đơn hàng': string;
  'Ngày mua': string;
  'Người mua': string;
  Email: string;
  'Mã tài sản': string;
  'Tên tài sản': string;
  'Tình trạng': string;
  'Đơn vị': string;
  'Pháp nhân': string;
  'Số lượng': number;
  'Đơn giá': number;
  'Thành tiền': number;
  'Tổng tiền đơn hàng': number;
  'Trạng thái thanh toán': string;
  'Trạng thái bàn giao': string;
  'Bước hiện tại': string;
}

function toStartOfDay(date: Date): Date {
  const result: Date = new Date(date.getTime());
  result.setHours(0, 0, 0, 0);
  return result;
}

function toEndOfDay(date: Date): Date {
  const result: Date = new Date(date.getTime());
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isOrderWithinDateRange(order: IOrderDetail, fromDate?: Date, toDate?: Date): boolean {
  const purchaseDate: Date = new Date(order.purchaseDate);

  if (fromDate && purchaseDate.getTime() < toStartOfDay(fromDate).getTime()) {
    return false;
  }

  if (toDate && purchaseDate.getTime() > toEndOfDay(toDate).getTime()) {
    return false;
  }

  return true;
}

export function filterOrdersByDateRange(orders: IOrderDetail[], fromDate?: Date, toDate?: Date): IOrderDetail[] {
  return orders.filter((order: IOrderDetail): boolean => isOrderWithinDateRange(order, fromDate, toDate));
}

export function buildTransactionExportRows(orders: IOrderDetail[]): ITransactionExportRow[] {
  const rows: ITransactionExportRow[] = [];

  orders.forEach((order: IOrderDetail): void => {
    order.items.forEach((item: IOrderItem): void => {
      rows.push({
        'Mã đơn hàng': order.orderCode,
        'Ngày mua': formatDate(order.purchaseDate),
        'Người mua': order.buyerName,
        Email: order.buyerEmail || '',
        'Mã tài sản': item.assetCode,
        'Tên tài sản': item.assetName,
        'Tình trạng': item.condition,
        'Đơn vị': item.site,
        'Pháp nhân': item.legalEntity,
        'Số lượng': item.quantity,
        'Đơn giá': item.unitPrice,
        'Thành tiền': item.amount,
        'Tổng tiền đơn hàng': order.totalAmount,
        'Trạng thái thanh toán': order.paymentStatus,
        'Trạng thái bàn giao': order.handoverStatus,
        'Bước hiện tại': order.currentStep
      });
    });
  });

  return rows;
}
