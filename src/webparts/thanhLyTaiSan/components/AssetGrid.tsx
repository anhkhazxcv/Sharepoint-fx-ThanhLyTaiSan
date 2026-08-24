import * as React from 'react';
import { AssetCard } from './AssetCard';
import type { IAssetItem } from './types';
import styles from './AssetGrid.module.scss';

export interface IAssetGridProps {
  assets: IAssetItem[];
  quantityInputs: Record<string, string>;
  errors: Record<string, string>;
  remainingLimit: number;
  submittingAssetIds?: Record<string, boolean>;
  isStopSellingEnabled?: boolean;
  onQuantityChange: (assetId: string, value: string) => void;
  onAddToCart: (asset: IAssetItem) => void;
}

export function AssetGrid(props: IAssetGridProps): React.ReactElement {
  const { assets, quantityInputs, errors, remainingLimit, submittingAssetIds, onQuantityChange, onAddToCart } = props;

  if (!assets.length) {
    return (
      <div className={styles.emptyState}>
        <strong>Không tìm thấy tài sản phù hợp</strong>
        <span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để xem thêm kết quả phù hợp hơn.</span>
      </div>
    );
  }

  return (
    <section className={styles.grid}>
      {assets.map((asset: IAssetItem) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          quantityValue={quantityInputs[asset.id] || ''}
          errorMessage={errors[asset.id]}
          remainingLimit={remainingLimit}
          isSubmitting={!!(submittingAssetIds && submittingAssetIds[asset.id])}
          isStopSellingEnabled={props.isStopSellingEnabled}
          onQuantityChange={onQuantityChange}
          onAddToCart={onAddToCart}
        />
      ))}
    </section>
  );
}
