import type { IAssetItem } from '../types';
import {
  aggregateQuantityByProductCode,
  buildAssetMonitorRecord,
  computeAssetMonitorKpi,
  DEFAULT_ASSET_MONITOR_FILTERS,
  DEFAULT_ASSET_MONITOR_SORT,
  filterAssetMonitorRecords,
  getAssetStockStatus,
  getAssetStockStatusLabel,
  sortAssetMonitorRecords,
  type IAssetMonitorRecord
} from './assetMonitorUtils';

function createAsset(overrides: Partial<IAssetItem> = {}): IAssetItem {
  return {
    id: '1',
    assetCode: 'TS001',
    assetName: 'Tai san A',
    condition: 'Moi',
    site: 'HN',
    address: 'Ha Noi',
    legalEntity: 'MAG',
    quantity: 5,
    unitOfMeasure: 'Cai',
    price: 100000,
    imageUrl: 'https://example.com/a.jpg',
    barcode: 'BC001',
    inServiceDate: '2024-01-01',
    statusText: 'Con hang',
    isVisibleToBuyer: true,
    ...overrides
  };
}

describe('assetMonitorUtils', () => {
  it('classifies stock status consistently with catalog thresholds', () => {
    expect(getAssetStockStatus(0)).toBe('soldOut');
    expect(getAssetStockStatus(3)).toBe('lowStock');
    expect(getAssetStockStatus(4)).toBe('available');
    expect(getAssetStockStatusLabel(1)).toBe('Sắp hết');
  });

  it('aggregates quantity by product code', () => {
    const quantityMap: Record<string, number> = aggregateQuantityByProductCode([
      { productCode: 'TS001', quantity: 2 },
      { productCode: 'TS001', quantity: 1 },
      { productCode: 'TS002', quantity: 4 }
    ]);

    expect(quantityMap.TS001).toBe(3);
    expect(quantityMap.TS002).toBe(4);
  });

  it('filters low stock and cart-only records', () => {
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', quantity: 2 }), 1, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', quantity: 10 }), 0, 3)
    ];

    const lowStockRecords = filterAssetMonitorRecords(records, {
      ...DEFAULT_ASSET_MONITOR_FILTERS,
      stockStatusFilters: ['lowStock']
    });

    const cartOnlyRecords = filterAssetMonitorRecords(records, {
      ...DEFAULT_ASSET_MONITOR_FILTERS,
      activityFilters: ['inCart']
    });

    expect(lowStockRecords).toHaveLength(1);
    expect(lowStockRecords[0].asset.assetCode).toBe('TS001');
    expect(cartOnlyRecords).toHaveLength(1);
    expect(cartOnlyRecords[0].asset.assetCode).toBe('TS002');
  });

  it('sorts by quantity using sort state', () => {
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', quantity: 8 }), 0, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', quantity: 1 }), 0, 0)
    ];

    const sortedAsc: IAssetMonitorRecord[] = sortAssetMonitorRecords(records, {
      columnKey: 'quantity',
      direction: 'asc'
    });
    const sortedDesc: IAssetMonitorRecord[] = sortAssetMonitorRecords(records, DEFAULT_ASSET_MONITOR_SORT);

    expect(sortedAsc[0].asset.assetCode).toBe('TS001');
    expect(sortedAsc[1].asset.assetCode).toBe('TS002');
    expect(sortedDesc[0].asset.assetCode).toBe('TS002');
    expect(sortedDesc[1].asset.assetCode).toBe('TS001');
  });

  it('sorts by asset name ascending', () => {
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', assetName: 'Zebra' }), 0, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', assetName: 'Alpha' }), 0, 0)
    ];

    const sorted: IAssetMonitorRecord[] = sortAssetMonitorRecords(records, {
      columnKey: 'assetName',
      direction: 'asc'
    });

    expect(sorted[0].asset.assetName).toBe('Alpha');
    expect(sorted[1].asset.assetName).toBe('Zebra');
  });

  it('sorts by stock status descending with available first', () => {
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', quantity: 0 }), 0, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', quantity: 10 }), 0, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS003', quantity: 2 }), 0, 0)
    ];

    const sorted: IAssetMonitorRecord[] = sortAssetMonitorRecords(records, {
      columnKey: 'stockStatus',
      direction: 'desc'
    });

    expect(sorted[0].asset.assetCode).toBe('TS002');
    expect(sorted[2].asset.assetCode).toBe('TS001');
  });

  it('sorts by visible ascending with hidden assets first', () => {
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', isVisibleToBuyer: true }), 0, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', isVisibleToBuyer: false }), 0, 0)
    ];

    const sorted: IAssetMonitorRecord[] = sortAssetMonitorRecords(records, {
      columnKey: 'visible',
      direction: 'asc'
    });

    expect(sorted[0].asset.isVisibleToBuyer).toBe(false);
    expect(sorted[1].asset.isVisibleToBuyer).toBe(true);
  });

  it('computes KPI totals from filtered records', () => {
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', quantity: 0, price: 100000 }), 2, 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', quantity: 2, price: 50000 }), 0, 1),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS003', quantity: 10, price: 20000 }), 0, 0)
    ];

    const kpi = computeAssetMonitorKpi(records);

    expect(kpi.totalCount).toBe(3);
    expect(kpi.soldOutCount).toBe(1);
    expect(kpi.lowStockCount).toBe(1);
    expect(kpi.availableCount).toBe(1);
    expect(kpi.remainingInventoryValue).toBe(300000);
  });
});

describe('assetMonitorUtils merge', () => {
  it('merges sold and cart quantities into monitor records', () => {
    const soldMap: Record<string, number> = aggregateQuantityByProductCode([
      { productCode: 'TS001', quantity: 2 }
    ]);
    const cartMap: Record<string, number> = aggregateQuantityByProductCode([
      { productCode: 'TS001', quantity: 1 }
    ]);
    const records: IAssetMonitorRecord[] = [
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS001', quantity: 4 }), soldMap.TS001 || 0, cartMap.TS001 || 0),
      buildAssetMonitorRecord(createAsset({ assetCode: 'TS002', quantity: 0 }), soldMap.TS002 || 0, cartMap.TS002 || 0)
    ];

    expect(records[0].soldQty).toBe(2);
    expect(records[0].cartQty).toBe(1);
    expect(records[1].soldQty).toBe(0);
  });
});
