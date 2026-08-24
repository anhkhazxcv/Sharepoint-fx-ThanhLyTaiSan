import type { SPHttpClient } from '@microsoft/sp-http';
import type { IAssetItem } from '../types';
import { getAssetsFromSharePoint } from './assetCatalogService';
import type { ICartLineRecord } from './cartService';
import type { IUserTransactionRecord } from './orderTransactionService';
import { getListItems, getNumberValue, getStringValue, type TSharePointItem } from './sharePointListUtils';
import { LST_CHI_TIET_GIO_HANG, LST_SAN_PHAM } from '../constants/sharePointLists';
import {
  aggregateQuantityByProductCode,
  buildAssetMonitorRecord,
  type IAssetMonitorRecord
} from './assetMonitorUtils';

export interface IAssetMonitorData {
  records: IAssetMonitorRecord[];
}

export async function getAllCartLineRecords(siteUrl: string, spHttpClient: SPHttpClient): Promise<ICartLineRecord[]> {
  const detailItems: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_CHI_TIET_GIO_HANG,
    ['ProductCode', 'Quantity', 'UnitPrice', 'LineTotal']
  );

  return detailItems.map((item: TSharePointItem): ICartLineRecord => ({
    productCode: getStringValue(item, ['ProductCode']),
    quantity: getNumberValue(item, ['Quantity'], 0),
    unitPrice: getNumberValue(item, ['UnitPrice'], 0),
    lineTotal: getNumberValue(item, ['LineTotal'], 0)
  }));
}

export function buildSoldQuantityMap(transactions: IUserTransactionRecord[]): Record<string, number> {
  const lines: Array<{ productCode: string; quantity: number }> = [];

  transactions.forEach((transaction: IUserTransactionRecord): void => {
    transaction.items.forEach((item): void => {
      lines.push({
        productCode: item.productCode,
        quantity: item.quantity
      });
    });
  });

  return aggregateQuantityByProductCode(lines);
}

export function buildCartQuantityMap(cartLines: ICartLineRecord[]): Record<string, number> {
  return aggregateQuantityByProductCode(
    cartLines.map((line: ICartLineRecord) => ({
      productCode: line.productCode,
      quantity: line.quantity
    }))
  );
}

export function buildAssetMonitorRecords(
  assets: IAssetItem[],
  soldQuantityMap: Record<string, number>,
  cartQuantityMap: Record<string, number>
): IAssetMonitorRecord[] {
  return assets.map((asset: IAssetItem): IAssetMonitorRecord => {
    const productCode: string = asset.assetCode.trim();

    return buildAssetMonitorRecord(
      asset,
      soldQuantityMap[productCode] || 0,
      cartQuantityMap[productCode] || 0
    );
  });
}

export function buildAssetMonitorData(
  assets: IAssetItem[],
  transactions: IUserTransactionRecord[],
  cartLines: ICartLineRecord[]
): IAssetMonitorData {
  const soldQuantityMap: Record<string, number> = buildSoldQuantityMap(transactions);
  const cartQuantityMap: Record<string, number> = buildCartQuantityMap(cartLines);

  return {
    records: buildAssetMonitorRecords(assets, soldQuantityMap, cartQuantityMap)
  };
}

export async function loadAssetMonitorData(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  transactions: IUserTransactionRecord[],
  assets?: IAssetItem[]
): Promise<IAssetMonitorData> {
  const cartLinesPromise: Promise<ICartLineRecord[]> = getAllCartLineRecords(siteUrl, spHttpClient);
  const assetsPromise: Promise<IAssetItem[]> = assets
    ? Promise.resolve(assets)
    : getAssetsFromSharePoint({
        siteUrl,
        spHttpClient,
        listTitle: LST_SAN_PHAM
      });

  const [resolvedAssets, cartLines] = await Promise.all([assetsPromise, cartLinesPromise]);

  return buildAssetMonitorData(resolvedAssets, transactions, cartLines);
}
