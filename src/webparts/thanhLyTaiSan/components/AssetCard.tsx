import * as React from 'react';
import { FiImage } from 'react-icons/fi';
import type { IAssetItem } from './types';
import { formatCurrency } from './utils/format';
import { AppButton, StatusBadge, type TStatusBadgeVariant } from './common';
import styles from './AssetCard.module.scss';

export interface IAssetCardProps {
  asset: IAssetItem;
  quantityValue: string;
  errorMessage?: string;
  remainingLimit: number;
  isSubmitting?: boolean;
  isStopSellingEnabled?: boolean;
  onQuantityChange: (assetId: string, value: string) => void;
  onAddToCart: (asset: IAssetItem) => void;
}

function formatDate(value: string): string {
  if (!value) {
    return 'Chưa có';
  }

  const parsedDate: Date = new Date(value);

  if (isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN').format(parsedDate);
}

function getStatusVariant(asset: IAssetItem): 'soldOut' | 'available' | 'lowStock' {
  if (asset.quantity <= 0) {
    return 'soldOut';
  }

  if (asset.quantity <= 3) {
    return 'lowStock';
  }

  return 'available';
}

function getStatusLabel(asset: IAssetItem): string {
  if (asset.quantity <= 0) {
    return 'Hết hàng';
  }

  return asset.statusText || 'Còn hàng';
}

function mapAssetStatusVariant(statusVariant: 'soldOut' | 'available' | 'lowStock'): TStatusBadgeVariant {
  if (statusVariant === 'soldOut') {
    return 'neutral';
  }

  if (statusVariant === 'lowStock') {
    return 'warning';
  }

  return 'success';
}

function getShortConditionLabel(condition: string): string {
  const normalizedCondition: string = condition.trim().toLowerCase();

  if (!normalizedCondition) {
    return 'Chưa cập nhật';
  }

  if (normalizedCondition.indexOf('mới') >= 0 || normalizedCondition.indexOf('new') >= 0) {
    return 'Mới';
  }

  if (normalizedCondition.indexOf('sửa') >= 0 || normalizedCondition.indexOf('hỏng') >= 0 || normalizedCondition.indexOf('lỗi') >= 0) {
    return 'Cần sửa chữa';
  }

  if (
    normalizedCondition.indexOf('đã qua') >= 0 ||
    normalizedCondition.indexOf('qua sử dụng') >= 0 ||
    normalizedCondition.indexOf('cũ') >= 0
  ) {
    return 'Đã qua sử dụng';
  }

  return condition.trim().length > 24 ? 'Đã qua sử dụng' : condition.trim();
}

function truncateText(value: string, maxLength: number): string {
  const trimmedValue: string = value.trim();

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return trimmedValue.slice(0, maxLength).trim() + '...';
}

interface IConditionPreviewProps {
  condition: string;
  isSoldOut: boolean;
}

function ConditionPreview(props: IConditionPreviewProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const conditionText: string = props.condition.trim() || 'Chưa cập nhật';
  const hasLongCondition: boolean = conditionText.length > 80;
  const previewText: string = hasLongCondition ? truncateText(conditionText, 80) : conditionText;

  return (
    <div className={styles.conditionBlock} title={conditionText}>
      <div className={styles.conditionHeader}>
        <span className={styles.conditionLabel}>Tình trạng</span>
        <span className={styles.conditionBadge} title={conditionText}>{getShortConditionLabel(conditionText)}</span>
      </div>
      <p className={styles.conditionText} title={conditionText}>
        {previewText}
        {hasLongCondition && (
          <>
            {' '}
            <button
              type="button"
              className={styles.inlineButton}
              onClick={() => setIsModalOpen(true)}
              disabled={props.isSoldOut}
            >
              Xem thêm
            </button>
          </>
        )}
      </p>

      {isModalOpen && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsModalOpen(false)}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết tình trạng tài sản"
            onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <strong>Tình trạng tài sản</strong>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <p className={styles.modalText}>{conditionText}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface IAssetInfoGridProps {
  asset: IAssetItem;
}

function AssetInfoGrid(props: IAssetInfoGridProps): React.ReactElement {
  const { asset } = props;
  const infoItems: Array<{ label: string; value: string | number; title?: string }> = [
    { label: 'Số lượng', value: asset.quantity },
    { label: 'Đơn vị', value: asset.unitOfMeasure || 'Chưa có' },
    { label: 'Ngày SD', value: formatDate(asset.inServiceDate) },
    { label: 'Barcode', value: asset.barcode || 'Chưa có', title: asset.barcode },
    { label: 'Địa chỉ', value: asset.address || 'Chưa có', title: asset.address }
  ];

  return (
    <div className={styles.infoGrid}>
      {infoItems.map((item: { label: string; value: string | number; title?: string }) => (
        <div key={item.label} className={styles.infoItem}>
          <span className={styles.infoLabel}>{item.label}</span>
          <strong className={styles.infoValue} title={item.title || String(item.value)}>
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

interface IQuantitySelectorProps {
  asset: IAssetItem;
  quantityValue: string;
  errorMessage?: string;
  remainingLimit: number;
  isSubmitting?: boolean;
  isSoldOut: boolean;
  isActionDisabled: boolean;
  isStopSellingEnabled?: boolean;
  onQuantityChange: (assetId: string, value: string) => void;
  onAddToCart: (asset: IAssetItem) => void;
}

function QuantitySelector(props: IQuantitySelectorProps): React.ReactElement {
  const maxQuantity: number = Math.min(props.asset.quantity, props.remainingLimit);
  const isStopSelling: boolean = !!props.isStopSellingEnabled;
  const isQuantityDisabled: boolean = isStopSelling || props.isSoldOut || props.remainingLimit === 0 || !!props.isSubmitting;

  return (
    <div className={styles.footer}>
      <div className={styles.purchasePanel}>
        <label className={styles.quantityField} htmlFor={`quantity-${props.asset.id}`}>
          <span className={styles.quantityLabel}>Số lượng</span>
          <input
            id={`quantity-${props.asset.id}`}
            className={`${styles.quantityInput} ${props.errorMessage ? styles.quantityError : ''}`}
            type="number"
            min={1}
            max={Math.max(maxQuantity, 0)}
            step={1}
            inputMode="numeric"
            value={props.isSoldOut ? '0' : props.quantityValue}
            disabled={isQuantityDisabled}
            aria-invalid={!!props.errorMessage}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => props.onQuantityChange(props.asset.id, event.target.value)}
          />
        </label>

        <AppButton
          variant="primary"
          className={styles.actionButtonSlot}
          disabled={props.isActionDisabled}
          onClick={() => props.onAddToCart(props.asset)}
        >
          {props.isSubmitting ? (
            <>
              <span className={styles.spinnerRing} aria-hidden="true" />
              Đang thêm
            </>
          ) : (
            'Đăng ký mua'
          )}
        </AppButton>
      </div>

      {props.isSoldOut ? (
        <span className={styles.helperText}>Sản phẩm đã hết hàng.</span>
      ) : isStopSelling ? (
        <span className={styles.helperText}>Hệ thống đã tạm dừng đăng ký mua.</span>
      ) : props.remainingLimit === 0 ? (
        <span className={styles.helperText}>Bạn đã đạt giới hạn mua tối đa.</span>
      ) : props.errorMessage ? (
        <span className={styles.errorText}>{props.errorMessage}</span>
      ) : (
        <span className={styles.helperText}>Tối đa {maxQuantity} sản phẩm</span>
      )}
    </div>
  );
}

function AssetCardComponent(props: IAssetCardProps): React.ReactElement {
  const { asset, quantityValue, errorMessage, remainingLimit, isSubmitting, isStopSellingEnabled, onQuantityChange, onAddToCart } = props;
  const [isImageBroken, setIsImageBroken] = React.useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = React.useState<boolean>(false);
  const hasImage: boolean = !!asset.imageUrl;
  const statusVariant: 'soldOut' | 'available' | 'lowStock' = getStatusVariant(asset);
  const isSoldOut: boolean = statusVariant === 'soldOut';
  const parsedQuantity: number = Number(quantityValue);
  const isWholeNumber: boolean = quantityValue !== '' && String(parsedQuantity) === quantityValue.trim();
  const hasValidQuantity: boolean =
    quantityValue.trim() !== '' &&
    isWholeNumber &&
    parsedQuantity > 0 &&
    parsedQuantity <= asset.quantity &&
    parsedQuantity <= remainingLimit;
  const isActionDisabled: boolean =
    !!isStopSellingEnabled || isSoldOut || !hasValidQuantity || !!errorMessage || remainingLimit === 0 || !!isSubmitting;

  const isFreePrice: boolean = asset.price === 0;

  React.useEffect(() => {
    setIsImageBroken(false);
    setIsImageLoaded(false);
  }, [asset.imageUrl]);

  return (
    <article className={`${styles.card} ${isSoldOut ? styles.soldOutCard : ''}`} aria-label={asset.assetName}>
      <div className={styles.mediaArea}>
        <div className={styles.imageFrame}>
          {!hasImage || isImageBroken ? (
            <div className={styles.imageFallback}>
              <FiImage className={styles.imageFallbackIcon} aria-label="Không có ảnh" />
              <span className={styles.imageFallbackText}>Không có ảnh</span>
            </div>
          ) : (
            <>
              {!isImageLoaded && <div className={styles.imageSkeleton} aria-hidden="true" />}
              <img
                className={`${styles.image} ${isImageLoaded ? styles.imageLoaded : ''}`}
                src={asset.imageUrl}
                alt={asset.assetName}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsImageLoaded(true)}
                onError={() => setIsImageBroken(true)}
              />
            </>
          )}
        </div>

        {isSoldOut && <div className={styles.soldOutOverlay} aria-hidden="true" />}
        <StatusBadge
          dot
          label={getStatusLabel(asset)}
          variant={mapAssetStatusVariant(statusVariant)}
          className={styles.assetStatusBadge}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.companyRow}>
          {asset.legalEntity && (
            <span className={styles.legalEntityText} title={asset.legalEntity}>
              {asset.legalEntity}
            </span>
          )}
          <span className={styles.locationText} title={asset.site}>
            {asset.site || 'Chưa cập nhật địa điểm'}
          </span>
        </div>

        <div className={styles.titleBlock}>
          <h3 className={styles.title} title={asset.assetName}>{asset.assetName}</h3>
          <div className={styles.assetCode} title={asset.assetCode}>Mã: {asset.assetCode}</div>
        </div>

        <div className={styles.priceBlock}>
          <span className={styles.priceLabel}>Giá thanh lý</span>
          <strong className={`${styles.price} ${isFreePrice ? styles.priceFree : ''}`}>{formatCurrency(asset.price)}</strong>
        </div>

        <ConditionPreview condition={asset.condition} isSoldOut={isSoldOut} />
        <AssetInfoGrid asset={asset} />
      </div>

      <QuantitySelector
        asset={asset}
        quantityValue={quantityValue}
        errorMessage={errorMessage}
        remainingLimit={remainingLimit}
        isSubmitting={isSubmitting}
        isSoldOut={isSoldOut}
        isActionDisabled={isActionDisabled}
        isStopSellingEnabled={isStopSellingEnabled}
        onQuantityChange={onQuantityChange}
        onAddToCart={onAddToCart}
      />
    </article>
  );
}

export const AssetCard = React.memo(AssetCardComponent);
