import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IOrderDetail, IOrderItem } from '../orderDetail/types';
import {
  buildOrFilter,
  deleteListItemById,
  escapeODataValue,
  getListItemByFilter,
  getListItems,
  getNumberValue,
  getStringValue,
  postListItem,
  updateListItemById,
  type TSharePointItem
} from './sharePointListUtils';
import { LST_CHI_TIET_DON_HANG, LST_DON_HANG, LST_SAN_PHAM } from '../constants/sharePointLists';
import type { IAssetImportOperation } from './assetImportUtils';
import { executeSharePointBatch } from './sharePointBatchUtils';

const ORDER_DETAIL_FILTER_BATCH_SIZE: number = 40;
const ORDER_DETAIL_SELECT_FIELDS: string[] = ['OrderId', 'ProductCode', 'LegalEntity', 'Quantity', 'UnitPrice', 'LineTotal'];
const ORDER_HEADER_SELECT_FIELDS: string[] = [
  'OrderId',
  'EmployeeName',
  'EmployeeEmail',
  'OrderDate',
  'Created',
  'TotalQuantity',
  'TotalAmount',
  'Status',
  'PaymentStatus',
  'Id'
];
let lastGeneratedOrderId: string = '';

export interface ICreateTransactionOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerName: string;
  buyerEmail: string;
  orderDetail: IOrderDetail;
}

export interface IUpdateTransactionStatusOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  orderId: string;
  status: string;
}

export interface IUpdateOrderPaymentStatusOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  orderId: string;
  paymentStatus: string;
}

export interface IUpdateAssetStockOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  assetItemId: string;
  nextStock: number;
}

export const STOCK_INSUFFICIENT_ERROR: string = 'Insufficient stock for selected items.';
export const STOCK_CONFLICT_ERROR: string = 'Stock conflict: item was modified by another user.';

export interface IAssetStockSnapshot {
  itemId: number;
  productCode: string;
  stock: number;
  etag: string;
}

export interface IStockReservationItem {
  productCode: string;
  quantity: number;
  assetName?: string;
}

export interface IAppliedStockDeduction {
  itemId: number;
  productCode: string;
  previousStock: number;
  deductedQuantity: number;
}

export interface IReserveStockForOrderOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  items: IStockReservationItem[];
}

export interface IReserveStockForOrderResult {
  deductions: IAppliedStockDeduction[];
}

export class StockReservationError extends Error {
  public readonly code: 'INSUFFICIENT' | 'CONFLICT';
  public readonly productNames?: string[];

  constructor(code: 'INSUFFICIENT' | 'CONFLICT', productNames?: string[]) {
    super(code === 'INSUFFICIENT' ? STOCK_INSUFFICIENT_ERROR : STOCK_CONFLICT_ERROR);
    this.code = code;
    this.productNames = productNames;
    this.name = 'StockReservationError';
  }
}

export function isStockReservationError(error: unknown): error is StockReservationError {
  if (error instanceof StockReservationError) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate: Partial<StockReservationError> = error as Partial<StockReservationError>;

  return (
    candidate.name === 'StockReservationError' ||
    candidate.code === 'CONFLICT' ||
    candidate.code === 'INSUFFICIENT' ||
    candidate.message === STOCK_CONFLICT_ERROR ||
    candidate.message === STOCK_INSUFFICIENT_ERROR
  );
}

export function getStockReservationErrorMessage(error: StockReservationError): string {
  if (error.code === 'CONFLICT') {
    return 'Sản phẩm vừa được người khác đăng ký. Vui lòng kiểm tra lại giỏ hàng.';
  }

  const unavailableNames: string = (error.productNames || []).join(', ');

  return unavailableNames
    ? 'Sản phẩm không còn đủ số lượng: ' + unavailableNames
    : 'Sản phẩm không còn đủ số lượng.';
}

export interface IRollbackTransactionOrderOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  orderId: string;
}

export interface IDeleteUnpaidTransactionOrderOptions extends IRollbackTransactionOrderOptions {
  orderItems: IUserTransactionLineRecord[];
}

export interface IUserTransactionLineRecord {
  productCode: string;
  legalEntity: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IUserTransactionRecord {
  orderId: string;
  orderCode: string;
  buyerName: string;
  buyerEmail: string;
  purchaseDate: string;
  totalAmount: number;
  totalQuantity: number;
  status: string;
  paymentStatus: string;
  items: IUserTransactionLineRecord[];
}

function createTwelveDigitCandidate(): string {
  const timestampPart: string = ('000000000' + String(Date.now())).slice(-9);
  const randomPart: string = ('000' + String(Math.floor(Math.random() * 1000))).slice(-3);
  let candidate: string = timestampPart + randomPart;

  if (lastGeneratedOrderId && candidate <= lastGeneratedOrderId) {
    candidate = String(Number(lastGeneratedOrderId) + 1);
  }

  candidate = ('000000000000' + candidate).slice(-12);
  lastGeneratedOrderId = candidate;

  return candidate;
}

async function getOrderDetailItemsByOrderIds(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  orderIds: string[]
): Promise<TSharePointItem[]> {
  const orderIdBatches: string[][] = [];

  for (let startIndex: number = 0; startIndex < orderIds.length; startIndex += ORDER_DETAIL_FILTER_BATCH_SIZE) {
    orderIdBatches.push(orderIds.slice(startIndex, startIndex + ORDER_DETAIL_FILTER_BATCH_SIZE));
  }

  const detailItemGroups: TSharePointItem[][] = await Promise.all(
    orderIdBatches.map((orderIdBatch: string[]): Promise<TSharePointItem[]> => {
      return getListItems(
        siteUrl,
        spHttpClient,
        LST_CHI_TIET_DON_HANG,
        ORDER_DETAIL_SELECT_FIELDS,
        buildOrFilter('OrderId', orderIdBatch)
      );
    })
  );

  return detailItemGroups.reduce((items: TSharePointItem[], group: TSharePointItem[]): TSharePointItem[] => {
    return items.concat(group);
  }, []);
}

function buildDetailMap(orderDetailItems: TSharePointItem[]): Record<string, IUserTransactionLineRecord[]> {
  const detailMap: Record<string, IUserTransactionLineRecord[]> = {};

  orderDetailItems.forEach((item: TSharePointItem) => {
    const orderId: string = getStringValue(item, ['OrderId']);

    if (!detailMap[orderId]) {
      detailMap[orderId] = [];
    }

    detailMap[orderId].push({
      productCode: getStringValue(item, ['ProductCode']),
      legalEntity: getStringValue(item, ['LegalEntity']),
      quantity: getNumberValue(item, ['Quantity'], 0),
      unitPrice: getNumberValue(item, ['UnitPrice'], 0),
      lineTotal: getNumberValue(item, ['LineTotal'], 0)
    });
  });

  return detailMap;
}

function mapOrderHeadersToRecords(
  orderHeaders: TSharePointItem[],
  detailMap: Record<string, IUserTransactionLineRecord[]>
): IUserTransactionRecord[] {
  return orderHeaders.map((item: TSharePointItem): IUserTransactionRecord => {
    const orderId: string = getStringValue(item, ['OrderId'], 'N/A');

    return {
      orderId,
      orderCode: orderId,
      buyerName: getStringValue(item, ['EmployeeName'], 'Chưa cập nhật'),
      buyerEmail: getStringValue(item, ['EmployeeEmail'], ''),
      purchaseDate: getStringValue(item, ['OrderDate', 'Created'], new Date().toISOString()),
      totalAmount: getNumberValue(item, ['TotalAmount'], 0),
      totalQuantity: getNumberValue(item, ['TotalQuantity'], 0),
      status: getStringValue(item, ['Status'], 'Chưa bàn giao'),
      paymentStatus: getStringValue(item, ['PaymentStatus'], 'Chờ xác nhận'),
      items: detailMap[orderId] || []
    };
  });
}

async function loadTransactionRecords(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  orderFilter?: string
): Promise<IUserTransactionRecord[]> {
  const orderHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_DON_HANG,
    ORDER_HEADER_SELECT_FIELDS,
    orderFilter
  );

  if (!orderHeaders.length) {
    return [];
  }

  const orderIds: string[] = orderHeaders
    .map((item: TSharePointItem) => getStringValue(item, ['OrderId']))
    .filter((value: string) => !!value);

  const orderDetailItems: TSharePointItem[] = await getOrderDetailItemsByOrderIds(siteUrl, spHttpClient, orderIds);
  const detailMap: Record<string, IUserTransactionLineRecord[]> = buildDetailMap(orderDetailItems);

  return mapOrderHeadersToRecords(orderHeaders, detailMap);
}

export async function createTransactionItem(options: ICreateTransactionOptions): Promise<void> {
  const items: IOrderItem[] = options.orderDetail.items;
  const totalQuantity: number = items.reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0);

  if (!items.length) {
    throw new Error('Không có sản phẩm trong đơn hàng để tạo giao dịch.');
  }

  await postListItem(options.siteUrl, options.spHttpClient, LST_DON_HANG, {
    OrderId: options.orderDetail.orderCode,
    EmployeeName: options.buyerName,
    EmployeeEmail: options.buyerEmail,
    OrderDate: options.orderDetail.purchaseDate,
    TotalQuantity: totalQuantity,
    TotalAmount: options.orderDetail.totalAmount,
    Status: options.orderDetail.handoverStatus,
    PaymentStatus: options.orderDetail.paymentStatus,
    Note: 'Created from cart'
  });

  const detailOperations: IAssetImportOperation[] = items.map((item: IOrderItem) => ({
    type: 'insert',
    productCode: item.assetCode,
    payload: {
      OrderId: options.orderDetail.orderCode,
      ProductCode: item.assetCode,
      LegalEntity: item.legalEntity,
      Quantity: item.quantity,
      UnitPrice: item.unitPrice,
      LineTotal: item.amount
    }
  }));
  const detailBatchResult = await executeSharePointBatch(
    options.siteUrl,
    options.spHttpClient,
    LST_CHI_TIET_DON_HANG,
    detailOperations
  );

  if (detailBatchResult.failedCount > 0) {
    throw new Error(
      'Không thể tạo chi tiết đơn hàng trên SharePoint. ' + detailBatchResult.errors.join(' ')
    );
  }
}

export async function generateUniqueOrderId(siteUrl: string, spHttpClient: SPHttpClient): Promise<string> {
  let attemptIndex: number = 0;

  while (attemptIndex < 10) {
    const candidate: string = createTwelveDigitCandidate();
    const existingItem = await getListItemByFilter(
      siteUrl,
      spHttpClient,
      LST_DON_HANG,
      "OrderId eq '" + escapeODataValue(candidate) + "'"
    );

    if (!existingItem) {
      return candidate;
    }

    attemptIndex += 1;
  }

  throw new Error('Không thể sinh mã đơn hàng 12 chữ số duy nhất.');
}

export async function getTransactionsByUser(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<IUserTransactionRecord[]> {
  const escapedEmail: string = escapeODataValue(userEmail);
  return loadTransactionRecords(siteUrl, spHttpClient, "EmployeeEmail eq '" + escapedEmail + "'");
}

export async function getAllTransactions(siteUrl: string, spHttpClient: SPHttpClient): Promise<IUserTransactionRecord[]> {
  return loadTransactionRecords(siteUrl, spHttpClient);
}

export async function updateTransactionStatus(options: IUpdateTransactionStatusOptions): Promise<void> {
  const listItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    LST_DON_HANG,
    "OrderId eq '" + escapeODataValue(options.orderId) + "'"
  );

  if (!listItem) {
    throw new Error('Không tìm thấy đơn hàng để cập nhật trạng thái.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, LST_DON_HANG, getNumberValue(listItem, ['Id']), {
    Status: options.status
  });
}

export async function updateOrderPaymentStatus(options: IUpdateOrderPaymentStatusOptions): Promise<void> {
  const listItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    LST_DON_HANG,
    "OrderId eq '" + escapeODataValue(options.orderId) + "'"
  );

  if (!listItem) {
    throw new Error('Không tìm thấy đơn hàng để cập nhật thanh toán.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, LST_DON_HANG, getNumberValue(listItem, ['Id']), {
    PaymentStatus: options.paymentStatus
  });
}

function getODataEtag(item: TSharePointItem): string | undefined {
  const etagValue: unknown = item['@odata.etag'];

  if (typeof etagValue === 'string' && etagValue.trim() !== '') {
    return etagValue;
  }

  return undefined;
}

export async function getAssetStockSnapshot(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  productCode: string
): Promise<IAssetStockSnapshot | undefined> {
  const snapshots: Map<string, IAssetStockSnapshot> = await getAssetStockSnapshots(
    siteUrl,
    spHttpClient,
    [productCode]
  );

  return snapshots.get(productCode.trim().toUpperCase());
}

function getUniqueTrimmedCodes(productCodes: string[]): string[] {
  const seen: { [key: string]: boolean } = {};
  const result: string[] = [];

  productCodes.forEach((productCode: string) => {
    const trimmed: string = productCode.trim();

    if (trimmed === '' || seen[trimmed]) {
      return;
    }

    seen[trimmed] = true;
    result.push(trimmed);
  });

  return result;
}

export async function getAssetStockSnapshots(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  productCodes: string[]
): Promise<Map<string, IAssetStockSnapshot>> {
  const snapshotMap: Map<string, IAssetStockSnapshot> = new Map<string, IAssetStockSnapshot>();
  const normalizedCodes: string[] = getUniqueTrimmedCodes(productCodes);

  if (!normalizedCodes.length) {
    return snapshotMap;
  }

  const filterQuery: string = buildOrFilter('ProductCode', normalizedCodes);
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(LST_SAN_PHAM) +
    "')/items?$select=Id,ProductCode,Stock&$filter=" +
    encodeURIComponent(filterQuery);
  const response: SPHttpClientResponse = await spHttpClient.get(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=minimal'
      }
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể đọc tồn kho sản phẩm từ SharePoint list ' + LST_SAN_PHAM + '. Response: ' + errorText);
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };
  const items: TSharePointItem[] = Array.isArray(json.value) ? json.value : [];

  items.forEach((item: TSharePointItem): void => {
    const itemId: number = getNumberValue(item, ['Id', 'ID']);
    const etag: string | undefined = getODataEtag(item);
    const resolvedProductCode: string = getStringValue(item, ['ProductCode']);

    if (!itemId || !etag || !resolvedProductCode) {
      return;
    }

    snapshotMap.set(resolvedProductCode.trim().toUpperCase(), {
      itemId,
      productCode: resolvedProductCode,
      stock: getNumberValue(item, ['Stock'], 0),
      etag
    });
  });

  return snapshotMap;
}

export async function restoreStockDeductions(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  deductions: IAppliedStockDeduction[]
): Promise<void> {
  if (!deductions.length) {
    return;
  }

  await Promise.all(
    deductions.map((deduction: IAppliedStockDeduction) =>
      updateAssetStock({
        siteUrl,
        spHttpClient,
        assetItemId: String(deduction.itemId),
        nextStock: deduction.previousStock
      }).catch((rollbackError: Error) => {
        // eslint-disable-next-line no-console
        console.error('Không thể hoàn tác tồn kho cho sản phẩm', deduction.productCode, rollbackError);
      })
    )
  );
}

async function batchDeductAssetStockWithEtag(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  deductions: Array<{
    snapshot: IAssetStockSnapshot;
    quantity: number;
  }>;
}): Promise<IAppliedStockDeduction[]> {
  if (!options.deductions.length) {
    return [];
  }

  const operations: IAssetImportOperation[] = options.deductions.map(
    (deduction: { snapshot: IAssetStockSnapshot; quantity: number }) => {
      if (deduction.quantity <= 0) {
        throw new Error('Số lượng trừ tồn không hợp lệ.');
      }

      if (deduction.snapshot.stock < deduction.quantity) {
        throw new StockReservationError('INSUFFICIENT', [deduction.snapshot.productCode]);
      }

      return {
        type: 'update',
        productCode: deduction.snapshot.productCode,
        itemId: deduction.snapshot.itemId,
        etag: deduction.snapshot.etag,
        payload: {
          Stock: deduction.snapshot.stock - deduction.quantity
        }
      };
    }
  );

  const batchResult = await executeSharePointBatch(
    options.siteUrl,
    options.spHttpClient,
    LST_SAN_PHAM,
    operations
  );

  if (batchResult.failedCount === 0) {
    return options.deductions.map(
      (deduction: { snapshot: IAssetStockSnapshot; quantity: number }) => ({
        itemId: deduction.snapshot.itemId,
        productCode: deduction.snapshot.productCode,
        previousStock: deduction.snapshot.stock,
        deductedQuantity: deduction.quantity
      })
    );
  }

  const appliedDeductions: IAppliedStockDeduction[] = [];

  batchResult.operationSuccess.forEach((isSuccess: boolean, index: number) => {
    if (!isSuccess) {
      return;
    }

    const deduction: { snapshot: IAssetStockSnapshot; quantity: number } = options.deductions[index];

    appliedDeductions.push({
      itemId: deduction.snapshot.itemId,
      productCode: deduction.snapshot.productCode,
      previousStock: deduction.snapshot.stock,
      deductedQuantity: deduction.quantity
    });
  });

  const hasConflict: boolean = batchResult.statusCodes.some((statusCode: number) => statusCode === 412);

  if (hasConflict) {
    await restoreStockDeductions(options.siteUrl, options.spHttpClient, appliedDeductions);
    throw new StockReservationError('CONFLICT');
  }

  await restoreStockDeductions(options.siteUrl, options.spHttpClient, appliedDeductions);
  throw new Error(batchResult.errors.join(' ') || 'Không thể cập nhật tồn kho sản phẩm.');
}

export async function reserveStockForOrder(options: IReserveStockForOrderOptions): Promise<IReserveStockForOrderResult> {
  const productCodes: string[] = options.items.map((item: IStockReservationItem) => item.productCode);
  const snapshotMap: Map<string, IAssetStockSnapshot> = await getAssetStockSnapshots(
    options.siteUrl,
    options.spHttpClient,
    productCodes
  );
  const pendingDeductions: Array<{
    snapshot: IAssetStockSnapshot;
    quantity: number;
    displayName: string;
  }> = [];

  try {
    for (let index: number = 0; index < options.items.length; index += 1) {
      const reservationItem: IStockReservationItem = options.items[index];
      const snapshot: IAssetStockSnapshot | undefined = snapshotMap.get(reservationItem.productCode.trim().toUpperCase());
      const displayName: string = reservationItem.assetName || reservationItem.productCode;

      if (!snapshot) {
        throw new StockReservationError('INSUFFICIENT', [displayName]);
      }

      if (snapshot.stock < reservationItem.quantity) {
        throw new StockReservationError('INSUFFICIENT', [displayName]);
      }

      pendingDeductions.push({
        snapshot,
        quantity: reservationItem.quantity,
        displayName
      });
    }

    const deductions: IAppliedStockDeduction[] = await batchDeductAssetStockWithEtag({
      siteUrl: options.siteUrl,
      spHttpClient: options.spHttpClient,
      deductions: pendingDeductions
    });

    return {
      deductions
    };
  } catch (error) {
    if (error instanceof StockReservationError) {
      throw error;
    }

    throw error;
  }
}

export async function updateAssetStock(options: IUpdateAssetStockOptions): Promise<void> {
  const assetItemId: number = Number(options.assetItemId);

  if (!assetItemId) {
    throw new Error('Asset item id không hợp lệ.');
  }

  await updateListItemById(options.siteUrl, options.spHttpClient, LST_SAN_PHAM, assetItemId, {
    Stock: options.nextStock
  });
}

export async function rollbackTransactionOrder(options: IRollbackTransactionOrderOptions): Promise<void> {
  const escapedOrderId: string = escapeODataValue(options.orderId);
  const orderDetailItems: TSharePointItem[] = await getListItems(
    options.siteUrl,
    options.spHttpClient,
    LST_CHI_TIET_DON_HANG,
    ['Id', 'OrderId'],
    "OrderId eq '" + escapedOrderId + "'"
  );
  const orderHeaders: TSharePointItem[] = await getListItems(
    options.siteUrl,
    options.spHttpClient,
    LST_DON_HANG,
    ['Id', 'OrderId'],
    "OrderId eq '" + escapedOrderId + "'"
  );

  await Promise.all(
    orderDetailItems.map((item: TSharePointItem) =>
      deleteListItemById(options.siteUrl, options.spHttpClient, LST_CHI_TIET_DON_HANG, getNumberValue(item, ['Id']))
    )
  );

  await Promise.all(
    orderHeaders.map((item: TSharePointItem) =>
      deleteListItemById(options.siteUrl, options.spHttpClient, LST_DON_HANG, getNumberValue(item, ['Id']))
    )
  );
}

export async function deleteUnpaidTransactionOrder(options: IDeleteUnpaidTransactionOrderOptions): Promise<void> {
  const stockDeltaByProductCode: Record<string, number> = {};

  options.orderItems.forEach((item: IUserTransactionLineRecord): void => {
    const productCode: string = (item.productCode || '').trim();

    if (!productCode) {
      return;
    }

    stockDeltaByProductCode[productCode] = (stockDeltaByProductCode[productCode] || 0) + item.quantity;
  });

  const productCodes: string[] = Object.keys(stockDeltaByProductCode);

  if (productCodes.length) {
    const filterQuery: string = buildOrFilter('ProductCode', productCodes);
    const assetItems: TSharePointItem[] = await getListItems(
      options.siteUrl,
      options.spHttpClient,
      LST_SAN_PHAM,
      ['Id', 'ProductCode', 'Stock'],
      filterQuery
    );
    const assetIdByProductCode: Record<string, number> = {};
    const assetStockByProductCode: Record<string, number> = {};

    assetItems.forEach((item: TSharePointItem): void => {
      const productCode: string = getStringValue(item, ['ProductCode']);
      const itemId: number = getNumberValue(item, ['Id']);
      const stock: number = getNumberValue(item, ['Stock']);

      if (!productCode || !itemId) {
        return;
      }

      assetIdByProductCode[productCode] = itemId;
      assetStockByProductCode[productCode] = stock;
    });

    await Promise.all(
      productCodes.map((productCode: string): Promise<void> => {
        const assetItemId: number | undefined = assetIdByProductCode[productCode];

        if (!assetItemId) {
          return Promise.resolve();
        }

        const currentStock: number = assetStockByProductCode[productCode] || 0;
        const restockAmount: number = stockDeltaByProductCode[productCode];
        const nextStock: number = Math.max(currentStock + restockAmount, 0);

        return updateAssetStock({
          siteUrl: options.siteUrl,
          spHttpClient: options.spHttpClient,
          assetItemId: String(assetItemId),
          nextStock
        });
      })
    );
  }

  await rollbackTransactionOrder({
    siteUrl: options.siteUrl,
    spHttpClient: options.spHttpClient,
    orderId: options.orderId
  });
}
