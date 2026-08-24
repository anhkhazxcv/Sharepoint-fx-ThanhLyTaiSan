export interface IAssetItem {
  id: string;
  assetCode: string;
  assetName: string;
  condition: string;
  site: string;
  address: string;
  legalEntity: string;
  quantity: number;
  unitOfMeasure: string;
  price: number;
  imageUrl: string;
  barcode: string;
  inServiceDate: string;
  statusText: string;
  isVisibleToBuyer: boolean;
}

export interface ICartItem {
  productCode: string;
  assetId: string;
  assetName: string;
  condition: string;
  site: string;
  legalEntity: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
  barcode: string;
  maxQuantity: number;
}

export interface IAssetFilters {
  condition: string;
  site: string;
  address: string;
}
