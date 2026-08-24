import { SPHttpClient } from '@microsoft/sp-http';
import type { IAssetItem } from '../types';
import { getListItems, getBooleanValue, getNumberValue, getStringValue, type TSharePointItem } from './sharePointListUtils';

import { IMAGE_LIBRARY_TITLE } from '../constants/sharePointLists';

export const ASSET_CATALOG_SELECT_FIELDS: string[] = [
  'Id',
  'ProductCode',
  'ProductName',
  'Stock',
  'Condition',
  'Site',
  'Address',
  'LegalEntity',
  'UnitOfMeasure',
  'Price',
  'Barcode',
  'InServiceDate',
  'IsVisibleToBuyer',
  'ImageName'
];

export interface IAssetCatalogServiceOptions {
  siteUrl: string;
  listTitle: string;
  spHttpClient: SPHttpClient;
}

function getItemId(item: TSharePointItem): number {
  return getNumberValue(item, ['Id', 'ID'], 0);
}

function getImageSourceValue(item: TSharePointItem): string {
  return getStringValue(item, ['ImageName']);
}

function joinUrlSegments(segments: string[]): string {
  return segments
    .filter(function (segment: string): boolean {
      return segment.trim() !== '';
    })
    .map(function (segment: string, index: number): string {
      if (index === 0) {
        return segment.replace(/\/$/, '');
      }

      return segment.replace(/^\/+|\/+$/g, '');
    })
    .join('/');
}

function buildImageUrl(siteUrl: string, item: TSharePointItem): string {
  const rawImageValue: string = getImageSourceValue(item);
  const normalizedSiteUrl: string = siteUrl.replace(/\/$/, '');

  if (!rawImageValue) {
    return '';
  }

  // If already a full external URL (e.g. cloud/CDN), return directly for best performance
  if (/^https?:\/\//i.test(rawImageValue)) {
    return rawImageValue;
  }

  let parsedSiteUrl: URL;

  try {
    parsedSiteUrl = new URL(normalizedSiteUrl);
  } catch {
    return '';
  }

  const siteOrigin: string = parsedSiteUrl.origin;
  const sitePath: string = parsedSiteUrl.pathname.replace(/\/$/, '');
  const previewBaseUrl: string = joinUrlSegments([siteOrigin, sitePath, '_layouts/15/getpreview.ashx']);
  let fileUrl: string = '';

  if (rawImageValue.charAt(0) === '/') {
    fileUrl = siteOrigin + rawImageValue;
  } else if (rawImageValue.indexOf('/') >= 0) {
    fileUrl = joinUrlSegments([siteOrigin, sitePath, rawImageValue]);
  } else {
    fileUrl = joinUrlSegments([siteOrigin, sitePath, IMAGE_LIBRARY_TITLE, rawImageValue]);
  }

  return previewBaseUrl + '?path=' + encodeURIComponent(fileUrl) + '&resolution=0';
}

function mapItemToAsset(item: TSharePointItem, siteUrl: string): IAssetItem {
  const stock: number = getNumberValue(item, ['Stock'], 0);
  const productCode: string = getStringValue(item, ['ProductCode'], 'N/A');
  const productName: string = getStringValue(item, ['ProductName'], 'Chưa có tên sản phẩm');

  return {
    id: String(getItemId(item) || productCode || '0'),
    assetCode: productCode,
    assetName: productName,
    condition: getStringValue(item, ['Condition'], 'Chưa cập nhật'),
    site: getStringValue(item, ['Site'], 'Chưa cập nhật'),
    address: getStringValue(item, ['Address'], ''),
    legalEntity: getStringValue(item, ['LegalEntity'], ''),
    quantity: stock,
    unitOfMeasure: getStringValue(item, ['UnitOfMeasure'], ''),
    price: getNumberValue(item, ['Price'], 0),
    imageUrl: buildImageUrl(siteUrl, item),
    barcode: getStringValue(item, ['Barcode'], ''),
    inServiceDate: getStringValue(item, ['InServiceDate'], ''),
    statusText: stock > 0 ? 'Còn hàng' : 'Hết hàng',
    isVisibleToBuyer: getBooleanValue(item, ['IsVisibleToBuyer'], true)
  };
}

export async function getAssetsFromSharePoint(options: IAssetCatalogServiceOptions): Promise<IAssetItem[]> {
  const items: TSharePointItem[] = await getListItems(
    options.siteUrl,
    options.spHttpClient,
    options.listTitle,
    ASSET_CATALOG_SELECT_FIELDS
  );
  const mappedItems: IAssetItem[] = items.map(function (item: TSharePointItem): IAssetItem {
    return mapItemToAsset(item, options.siteUrl);
  });

  return mappedItems;
}
