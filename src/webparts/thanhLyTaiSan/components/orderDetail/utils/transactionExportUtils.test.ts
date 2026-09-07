import type { IOrderDetail, IOrderItem, TProcessStep } from '../types';
import { buildTransactionExportRows, filterOrdersByDateRange, isOrderWithinDateRange } from './transactionExportUtils';

function createItem(overrides: Partial<IOrderItem> = {}): IOrderItem {
  return {
    id: 'item-1',
    assetId: 'asset-1',
    assetCode: 'TS001',
    assetName: 'Ban lam viec',
    condition: 'Moi',
    site: 'HN',
    legalEntity: 'MAG',
    quantity: 2,
    unitPrice: 500000,
    amount: 1000000,
    imageUrl: '',
    barcode: 'BC001',
    ...overrides
  };
}

function createOrder(overrides: Partial<IOrderDetail> = {}): IOrderDetail {
  return {
    orderId: 'order-1',
    orderCode: 'DH001',
    buyerName: 'Nguyen Van A',
    buyerEmail: 'a@example.com',
    purchaseDate: '2026-08-10T12:00:00',
    totalAmount: 1000000,
    currentStep: 'Hoàn tất' as TProcessStep,
    paymentStatus: 'Đã thanh toán',
    handoverStatus: 'Đã bàn giao',
    items: [createItem()],
    ...overrides
  };
}

describe('transactionExportUtils', () => {
  describe('isOrderWithinDateRange', () => {
    it('returns true when no date bounds are provided', () => {
      expect(isOrderWithinDateRange(createOrder())).toBe(true);
    });

    it('excludes orders purchased before fromDate', () => {
      const order: IOrderDetail = createOrder({ purchaseDate: '2026-08-01T12:00:00' });
      expect(isOrderWithinDateRange(order, new Date('2026-08-10'))).toBe(false);
    });

    it('includes orders purchased exactly on fromDate', () => {
      const order: IOrderDetail = createOrder({ purchaseDate: '2026-08-10T18:00:00' });
      expect(isOrderWithinDateRange(order, new Date('2026-08-10'))).toBe(true);
    });

    it('includes orders purchased exactly on toDate (inclusive end of day)', () => {
      const order: IOrderDetail = createOrder({ purchaseDate: '2026-08-10T23:00:00' });
      expect(isOrderWithinDateRange(order, undefined, new Date('2026-08-10'))).toBe(true);
    });

    it('excludes orders purchased after toDate', () => {
      const order: IOrderDetail = createOrder({ purchaseDate: '2026-08-12T00:00:00' });
      expect(isOrderWithinDateRange(order, undefined, new Date('2026-08-10'))).toBe(false);
    });
  });

  describe('filterOrdersByDateRange', () => {
    it('keeps only orders within the range', () => {
      const orders: IOrderDetail[] = [
        createOrder({ orderId: 'in-range', purchaseDate: '2026-08-10T12:00:00' }),
        createOrder({ orderId: 'out-of-range', purchaseDate: '2026-01-01T12:00:00' })
      ];

      const result: IOrderDetail[] = filterOrdersByDateRange(orders, new Date('2026-08-01'), new Date('2026-08-31'));

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe('in-range');
    });
  });

  describe('buildTransactionExportRows', () => {
    it('produces one row per order item', () => {
      const orders: IOrderDetail[] = [
        createOrder({ items: [createItem({ assetCode: 'TS001' }), createItem({ assetCode: 'TS002' })] }),
        createOrder({ orderId: 'order-2', orderCode: 'DH002', items: [createItem({ assetCode: 'TS003' })] })
      ];

      const rows = buildTransactionExportRows(orders);

      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row['Mã tài sản'])).toEqual(['TS001', 'TS002', 'TS003']);
    });

    it('maps order and item fields into the expected columns', () => {
      const order: IOrderDetail = createOrder();
      const [row] = buildTransactionExportRows([order]);

      expect(row).toEqual({
        'Mã đơn hàng': 'DH001',
        'Ngày mua': '10/08/2026',
        'Người mua': 'Nguyen Van A',
        Email: 'a@example.com',
        'Mã tài sản': 'TS001',
        'Tên tài sản': 'Ban lam viec',
        'Tình trạng': 'Moi',
        'Đơn vị': 'HN',
        'Pháp nhân': 'MAG',
        'Số lượng': 2,
        'Đơn giá': 500000,
        'Thành tiền': 1000000,
        'Tổng tiền đơn hàng': 1000000,
        'Trạng thái thanh toán': 'Đã thanh toán',
        'Trạng thái bàn giao': 'Đã bàn giao',
        'Bước hiện tại': 'Hoàn tất'
      });
    });

    it('returns an empty array when an order has no items', () => {
      const rows = buildTransactionExportRows([createOrder({ items: [] })]);
      expect(rows).toHaveLength(0);
    });
  });
});
