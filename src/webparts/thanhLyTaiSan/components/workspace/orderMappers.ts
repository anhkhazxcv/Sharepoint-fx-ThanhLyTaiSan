import type { IOrderDetail, IOrderItem } from '../orderDetail/types';
import type { IAssetItem } from '../types';
import type { IBankInfoRecord } from '../services/bankInfoService';
import type { IUserTransactionLineRecord, IUserTransactionRecord } from '../services/orderTransactionService';

export function createAssetPlaceholder(label: string): string {
  const svg: string =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
    "<rect width='120' height='120' rx='14' fill='#eef2f7'/>" +
    "<rect x='16' y='16' width='88' height='88' rx='12' fill='white' opacity='0.9'/>" +
    "<rect x='28' y='30' width='28' height='28' rx='8' fill='#cbd5e1'/>" +
    "<rect x='64' y='34' width='24' height='8' rx='4' fill='#94a3b8'/>" +
    "<rect x='64' y='48' width='18' height='6' rx='3' fill='#cbd5e1'/>" +
    "<text x='24' y='94' font-family='Segoe UI, Arial' font-size='10' font-weight='700' fill='#334155'>" +
    label.slice(0, 16) +
    '</text>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function buildTransferContent(orderId: string): string {
  const normalizedOrderId: string = (orderId || '').trim();

  return ('muathanhly ' + normalizedOrderId).trim();
}

function padTwoDigits(value: number): string {
  return value < 10 ? '0' + String(value) : String(value);
}

export function getOrderStateFromStatuses(
  paymentStatus: string,
  handoverStatus: string
): Pick<IOrderDetail, 'currentStep' | 'paymentStatus' | 'handoverStatus'> {
  if (handoverStatus === 'Đã bàn giao') {
    return {
      currentStep: 'Hoàn tất',
      paymentStatus: paymentStatus || 'Đã thanh toán',
      handoverStatus: 'Đã bàn giao'
    };
  }

  if (paymentStatus === 'Đã thanh toán') {
    return {
      currentStep: 'Bàn giao',
      paymentStatus: 'Đã thanh toán',
      handoverStatus: handoverStatus || 'Chờ bàn giao'
    };
  }

  return {
    currentStep: 'Thanh toán',
    paymentStatus: paymentStatus || 'Chờ xác nhận',
    handoverStatus: handoverStatus || 'Chưa bàn giao'
  };
}

function resolveBankInfo(legalEntity: string, bankInfoMap: Record<string, IBankInfoRecord>): IBankInfoRecord | undefined {
  return bankInfoMap[legalEntity];
}

export function mapLineRecordToOrderItem(
  orderId: string,
  line: IUserTransactionLineRecord,
  assets: IAssetItem[],
  index: number,
  bankInfoMap: Record<string, IBankInfoRecord>,
  transferContent: string
): IOrderItem {
  const matchedAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => asset.assetCode === line.productCode)[0];
  const legalEntity: string = line.legalEntity || (matchedAsset ? matchedAsset.legalEntity : '');
  const bankInfo: IBankInfoRecord | undefined = resolveBankInfo(legalEntity, bankInfoMap);

  return {
    id: orderId + '-' + padTwoDigits(index + 1),
    assetId: matchedAsset ? matchedAsset.id : line.productCode,
    assetCode: line.productCode,
    assetName: matchedAsset ? matchedAsset.assetName : line.productCode,
    condition: matchedAsset ? matchedAsset.condition : 'Chưa cập nhật',
    site: matchedAsset ? matchedAsset.site : 'Chưa cập nhật',
    legalEntity,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    amount: line.lineTotal,
    imageUrl: matchedAsset ? matchedAsset.imageUrl : createAssetPlaceholder(line.productCode),
    barcode: matchedAsset ? matchedAsset.barcode : '',
    bankAccountName: bankInfo ? bankInfo.legalEntity : '',
    bankAccountNumber: bankInfo ? bankInfo.accountNumber : '',
    transferContent
  };
}

export function mapTransactionRecordToOrderDetail(
  record: IUserTransactionRecord,
  assets: IAssetItem[],
  bankInfoMap: Record<string, IBankInfoRecord>
): IOrderDetail {
  const orderState = getOrderStateFromStatuses(record.paymentStatus, record.status);
  const transferContent: string = buildTransferContent(record.orderId);
  const orderItems: IOrderItem[] = record.items.map((line: IUserTransactionLineRecord, index: number) =>
    mapLineRecordToOrderItem(record.orderId, line, assets, index, bankInfoMap, transferContent)
  );

  return {
    orderId: record.orderId,
    orderCode: record.orderCode,
    buyerName: record.buyerName,
    buyerEmail: record.buyerEmail,
    purchaseDate: record.purchaseDate,
    totalAmount: record.totalAmount,
    currentStep: orderState.currentStep,
    paymentStatus: orderState.paymentStatus,
    handoverStatus: orderState.handoverStatus,
    items: orderItems
  };
}

export function mapOrderDetailToTransactionRecord(orderDetail: IOrderDetail, userEmail: string): IUserTransactionRecord {
  return {
    orderId: orderDetail.orderId,
    orderCode: orderDetail.orderCode,
    buyerName: orderDetail.buyerName,
    buyerEmail: userEmail,
    purchaseDate: orderDetail.purchaseDate,
    totalAmount: orderDetail.totalAmount,
    totalQuantity: orderDetail.items.reduce((sum: number, item: IOrderItem) => sum + item.quantity, 0),
    status: orderDetail.handoverStatus,
    paymentStatus: orderDetail.paymentStatus,
    items: orderDetail.items.map((item: IOrderItem): IUserTransactionLineRecord => ({
      productCode: item.assetCode,
      legalEntity: item.legalEntity,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.amount
    }))
  };
}

export function applyRestockToAssetState(assets: IAssetItem[], orderItems: IUserTransactionLineRecord[]): IAssetItem[] {
  const restockByProductCode: Record<string, number> = {};

  orderItems.forEach((item: IUserTransactionLineRecord): void => {
    const productCode: string = (item.productCode || '').trim();

    if (!productCode) {
      return;
    }

    restockByProductCode[productCode] = (restockByProductCode[productCode] || 0) + item.quantity;
  });

  return assets.map((asset: IAssetItem): IAssetItem => {
    const restock: number = restockByProductCode[asset.assetCode] || 0;

    if (!restock) {
      return asset;
    }

    const nextStock: number = Math.max(asset.quantity + restock, 0);

    return {
      ...asset,
      quantity: nextStock,
      statusText: nextStock > 0 ? 'Còn hàng' : 'Hết hàng'
    };
  });
}
