import type { IDropdownOption } from '@fluentui/react';
import type { IAssetItem } from '../types';
import type { TStatusBadgeVariant } from '../common/StatusBadge';

export type TAssetStockStatus = 'available' | 'lowStock' | 'soldOut';
export type TAssetMonitorSortColumnKey =
  | 'assetCode'
  | 'assetName'
  | 'quantity'
  | 'stockStatus'
  | 'visible'
  | 'price'
  | 'legalEntity'
  | 'site'
  | 'condition'
  | 'soldQty'
  | 'cartQty'
  | 'unit';
export type TAssetMonitorSortDirection = 'asc' | 'desc';

export interface IAssetMonitorSortState {
  columnKey: TAssetMonitorSortColumnKey;
  direction: TAssetMonitorSortDirection;
}

export interface IAssetMonitorRecord {
  asset: IAssetItem;
  soldQty: number;
  cartQty: number;
}

export interface IAssetMonitorFilters {
  search: string;
  stockStatusFilters: TAssetStockStatus[];
  site: string;
  legalEntity: string;
  condition: string;
  address: string;
  priceType: '' | 'free' | 'paid';
  activityFilters: string[];
}

export interface IAssetMonitorKpi {
  totalCount: number;
  availableCount: number;
  lowStockCount: number;
  soldOutCount: number;
  remainingInventoryValue: number;
}

export interface IAssetOrderLink {
  orderId: string;
  orderCode: string;
  buyerName: string;
  quantity: number;
  paymentStatus: string;
  handoverStatus: string;
  purchaseDate: string;
}

export const ASSET_STOCK_STATUS_FILTER_OPTIONS: Array<{ value: TAssetStockStatus; label: string }> = [
  { value: 'available', label: 'Còn hàng' },
  { value: 'lowStock', label: 'Sắp hết' },
  { value: 'soldOut', label: 'Hết hàng' }
];

export const ASSET_ACTIVITY_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'inCart', label: 'Có hàng trong giỏ' },
  { value: 'hasOrders', label: 'Đã có đơn' }
];

export const ASSET_PRICE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'free', label: 'Miễn phí' },
  { value: 'paid', label: 'Có giá' }
];

export const DEFAULT_ASSET_MONITOR_SORT: IAssetMonitorSortState = {
  columnKey: 'quantity',
  direction: 'desc'
};

export const DEFAULT_ASSET_MONITOR_FILTERS: IAssetMonitorFilters = {
  search: '',
  stockStatusFilters: [],
  site: '',
  legalEntity: '',
  condition: '',
  address: '',
  priceType: '',
  activityFilters: []
};

const LOW_STOCK_THRESHOLD: number = 3;

export function toDropdownOptions(
  items: Array<{ value: string; label: string }>,
  includeAll?: boolean
): IDropdownOption[] {
  const options: IDropdownOption[] = items.map((item: { value: string; label: string }) => ({
    key: item.value,
    text: item.label
  }));

  if (includeAll) {
    return [{ key: '', text: 'Tất cả' }, ...options];
  }

  return options;
}

export function toggleDropdownMultiSelectValue<T extends string>(
  currentValues: T[],
  optionKey: string,
  selected: boolean
): T[] {
  if (selected) {
    return currentValues.indexOf(optionKey as T) >= 0 ? currentValues : currentValues.concat(optionKey as T);
  }

  return currentValues.filter((value: T) => value !== optionKey);
}

export function getAssetStockStatus(stock: number): TAssetStockStatus {
  if (stock <= 0) {
    return 'soldOut';
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return 'lowStock';
  }

  return 'available';
}

export function getAssetStockStatusLabel(stock: number): string {
  const status: TAssetStockStatus = getAssetStockStatus(stock);

  if (status === 'soldOut') {
    return 'Hết hàng';
  }

  if (status === 'lowStock') {
    return 'Sắp hết';
  }

  return 'Còn hàng';
}

export function getAssetStockStatusVariant(stock: number): TStatusBadgeVariant {
  const status: TAssetStockStatus = getAssetStockStatus(stock);

  if (status === 'soldOut') {
    return 'neutral';
  }

  if (status === 'lowStock') {
    return 'warning';
  }

  return 'success';
}

export function buildAssetMonitorRecord(
  asset: IAssetItem,
  soldQty: number,
  cartQty: number
): IAssetMonitorRecord {
  return {
    asset,
    soldQty,
    cartQty
  };
}

export function aggregateQuantityByProductCode(
  lines: Array<{ productCode: string; quantity: number }>
): Record<string, number> {
  const quantityMap: Record<string, number> = {};

  lines.forEach((line: { productCode: string; quantity: number }): void => {
    const productCode: string = line.productCode.trim();

    if (!productCode) {
      return;
    }

    quantityMap[productCode] = (quantityMap[productCode] || 0) + line.quantity;
  });

  return quantityMap;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function filterAssetMonitorRecords(
  records: IAssetMonitorRecord[],
  filters: IAssetMonitorFilters
): IAssetMonitorRecord[] {
  const normalizedSearch: string = normalizeSearchValue(filters.search);

  return records.filter((record: IAssetMonitorRecord): boolean => {
    const asset: IAssetItem = record.asset;

    if (normalizedSearch) {
      const matchesSearch: boolean =
        normalizeSearchValue(asset.assetCode).indexOf(normalizedSearch) >= 0 ||
        normalizeSearchValue(asset.assetName).indexOf(normalizedSearch) >= 0 ||
        normalizeSearchValue(asset.barcode).indexOf(normalizedSearch) >= 0;

      if (!matchesSearch) {
        return false;
      }
    }

    if (filters.stockStatusFilters.length) {
      const stockStatus: TAssetStockStatus = getAssetStockStatus(asset.quantity);

      if (filters.stockStatusFilters.indexOf(stockStatus) < 0) {
        return false;
      }
    }

    if (filters.site && asset.site !== filters.site) {
      return false;
    }

    if (filters.legalEntity && asset.legalEntity !== filters.legalEntity) {
      return false;
    }

    if (filters.condition && asset.condition !== filters.condition) {
      return false;
    }

    if (filters.address && asset.address !== filters.address) {
      return false;
    }

    if (filters.priceType === 'free' && asset.price !== 0) {
      return false;
    }

    if (filters.priceType === 'paid' && asset.price <= 0) {
      return false;
    }

    if (filters.activityFilters.indexOf('inCart') >= 0 && record.cartQty <= 0) {
      return false;
    }

    if (filters.activityFilters.indexOf('hasOrders') >= 0 && record.soldQty <= 0) {
      return false;
    }

    return true;
  });
}

function compareStringValues(left: string, right: string, direction: TAssetMonitorSortDirection): number {
  const result: number = left.localeCompare(right, 'vi');
  return direction === 'asc' ? result : -result;
}

function compareNumberValues(left: number, right: number, direction: TAssetMonitorSortDirection): number {
  const result: number = left - right;
  return direction === 'asc' ? result : -result;
}

function compareNullableStringValues(left: string, right: string, direction: TAssetMonitorSortDirection): number {
  const leftEmpty: boolean = !left.trim();
  const rightEmpty: boolean = !right.trim();

  if (leftEmpty && rightEmpty) {
    return 0;
  }

  if (leftEmpty) {
    return 1;
  }

  if (rightEmpty) {
    return -1;
  }

  return compareStringValues(left, right, direction);
}

function getStockStatusSortOrder(status: TAssetStockStatus): number {
  if (status === 'soldOut') {
    return 0;
  }

  if (status === 'lowStock') {
    return 1;
  }

  return 2;
}

export function sortAssetMonitorRecords(
  records: IAssetMonitorRecord[],
  sortState: IAssetMonitorSortState
): IAssetMonitorRecord[] {
  const nextRecords: IAssetMonitorRecord[] = records.slice();

  nextRecords.sort((left: IAssetMonitorRecord, right: IAssetMonitorRecord): number => {
    switch (sortState.columnKey) {
      case 'assetCode':
        return compareStringValues(left.asset.assetCode, right.asset.assetCode, sortState.direction);
      case 'assetName':
        return compareStringValues(left.asset.assetName, right.asset.assetName, sortState.direction);
      case 'stockStatus':
        return compareNumberValues(
          getStockStatusSortOrder(getAssetStockStatus(left.asset.quantity)),
          getStockStatusSortOrder(getAssetStockStatus(right.asset.quantity)),
          sortState.direction
        );
      case 'visible':
        return compareNumberValues(
          Number(left.asset.isVisibleToBuyer),
          Number(right.asset.isVisibleToBuyer),
          sortState.direction
        );
      case 'price':
        return compareNumberValues(left.asset.price, right.asset.price, sortState.direction);
      case 'legalEntity':
        return compareNullableStringValues(left.asset.legalEntity, right.asset.legalEntity, sortState.direction);
      case 'site':
        return compareNullableStringValues(left.asset.site, right.asset.site, sortState.direction);
      case 'condition':
        return compareNullableStringValues(left.asset.condition, right.asset.condition, sortState.direction);
      case 'unit':
        return compareNullableStringValues(left.asset.unitOfMeasure, right.asset.unitOfMeasure, sortState.direction);
      case 'cartQty':
        return compareNumberValues(left.cartQty, right.cartQty, sortState.direction);
      case 'soldQty':
        return compareNumberValues(left.soldQty, right.soldQty, sortState.direction);
      case 'quantity':
      default:
        return compareNumberValues(left.asset.quantity, right.asset.quantity, sortState.direction);
    }
  });

  return nextRecords;
}

export function computeAssetMonitorKpi(records: IAssetMonitorRecord[]): IAssetMonitorKpi {
  let availableCount: number = 0;
  let lowStockCount: number = 0;
  let soldOutCount: number = 0;
  let remainingInventoryValue: number = 0;

  records.forEach((record: IAssetMonitorRecord): void => {
    const stockStatus: TAssetStockStatus = getAssetStockStatus(record.asset.quantity);

    if (stockStatus === 'available') {
      availableCount += 1;
    } else if (stockStatus === 'lowStock') {
      lowStockCount += 1;
    } else {
      soldOutCount += 1;
    }

    remainingInventoryValue += record.asset.quantity * record.asset.price;
  });

  return {
    totalCount: records.length,
    availableCount,
    lowStockCount,
    soldOutCount,
    remainingInventoryValue
  };
}

export function getUniqueAssetFieldValues(records: IAssetMonitorRecord[], key: keyof IAssetItem): string[] {
  const values: string[] = [];

  records.forEach((record: IAssetMonitorRecord): void => {
    const value: string = String(record.asset[key] || '').trim();

    if (value && values.indexOf(value) < 0) {
      values.push(value);
    }
  });

  return values.sort((left: string, right: string): number => left.localeCompare(right, 'vi'));
}
