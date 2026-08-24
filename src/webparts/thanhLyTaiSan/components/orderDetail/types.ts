export type TProcessStep = 'Đăng ký' | 'Thanh toán' | 'Bàn giao' | 'Hoàn tất';

export interface IOrderItem {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  condition: string;
  site: string;
  legalEntity: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  imageUrl: string;
  barcode: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  qrImageUrl?: string;
  transferContent?: string;
}

export interface IOrderDetail {
  orderId: string;
  orderCode: string;
  buyerName: string;
  buyerEmail?: string;
  purchaseDate: string;
  totalAmount: number;
  currentStep: TProcessStep;
  paymentStatus: string;
  handoverStatus: string;
  items: IOrderItem[];
}
