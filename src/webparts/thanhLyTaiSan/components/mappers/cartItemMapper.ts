import type { ICartLineRecord } from '../services/cartService';
import type { IAssetItem, ICartItem } from '../types';

export function mapCartRecordsToItems(assets: IAssetItem[], cartRecords: ICartLineRecord[]): ICartItem[] {
  return cartRecords
    .map((record: ICartLineRecord) => {
      const matchedAsset: IAssetItem | undefined = assets.filter(
        (asset: IAssetItem) => asset.assetCode === record.productCode
      )[0];

      if (!matchedAsset) {
        return undefined;
      }

      return {
        productCode: record.productCode,
        assetId: matchedAsset.id,
        assetName: matchedAsset.assetName,
        condition: matchedAsset.condition,
        site: matchedAsset.site,
        legalEntity: matchedAsset.legalEntity,
        quantity: record.quantity,
        unitPrice: record.unitPrice,
        lineTotal: record.lineTotal,
        imageUrl: matchedAsset.imageUrl,
        barcode: matchedAsset.barcode,
        maxQuantity: matchedAsset.quantity
      };
    })
    .filter((item): item is ICartItem => !!item);
}
