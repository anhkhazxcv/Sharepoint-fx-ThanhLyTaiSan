import * as React from 'react';
import type { IOrderDetail } from './types';
import type { IAssetMonitorRecord } from '../services/assetMonitorUtils';
import { getAssetStockStatusLabel, getAssetStockStatusVariant, type IAssetOrderLink } from '../services/assetMonitorUtils';
import { AppButton, StatusBadge, getStatusBadgeVariantFromOrderStatus } from '../common';
import { formatCurrency, formatDate } from './utils/format';
import styles from './AdminAssetDetailPanel.module.scss';

export interface IAdminAssetDetailPanelProps {
  record: IAssetMonitorRecord;
  relatedOrders: IAssetOrderLink[];
  onClose: () => void;
  onOpenOrder: (order: IOrderDetail) => void;
}

function formatInServiceDate(value: string): string {
  if (!value) {
    return 'Chưa có';
  }

  const parsedDate: Date = new Date(value);

  if (isNaN(parsedDate.getTime())) {
    return value;
  }

  return formatDate(parsedDate.toISOString());
}

export function AdminAssetDetailPanel(props: IAdminAssetDetailPanelProps): React.ReactElement {
  const { asset } = props.record;

  return (
    <aside className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="admin-asset-detail-title">
      <div className={styles.header}>
        <div>
          <h3 id="admin-asset-detail-title" className={styles.title}>
            {asset.assetName}
          </h3>
          <span className={styles.subtitle}>Mã: {asset.assetCode}</span>
        </div>
        <button type="button" className={styles.closeButton} onClick={props.onClose} aria-label="Đóng chi tiết">
          ×
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.imageWrap}>
          {asset.imageUrl ? (
            <img src={asset.imageUrl} alt={asset.assetName} className={styles.image} />
          ) : (
            <div className={styles.imageFallback}>Chưa có ảnh</div>
          )}
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Tồn hiện tại</span>
            <strong>{asset.quantity}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Đã đăng ký mua</span>
            <strong>{props.record.soldQty}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Đang trong giỏ</span>
            <strong>{props.record.cartQty}</strong>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div>
            <span className={styles.metaLabel}>Trạng thái tồn</span>
            <StatusBadge label={getAssetStockStatusLabel(asset.quantity)} variant={getAssetStockStatusVariant(asset.quantity)} />
          </div>
          <div>
            <span className={styles.metaLabel}>Giá thanh lý</span>
            <strong>{asset.price > 0 ? formatCurrency(asset.price) : 'Miễn phí'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Pháp nhân</span>
            <strong>{asset.legalEntity || 'Chưa có'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Site</span>
            <strong>{asset.site || 'Chưa có'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Địa chỉ</span>
            <strong>{asset.address || 'Chưa có'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Tình trạng</span>
            <strong>{asset.condition || 'Chưa có'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Đơn vị</span>
            <strong>{asset.unitOfMeasure || 'Chưa có'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Barcode</span>
            <strong>{asset.barcode || 'Chưa có'}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Ngày đưa vào SD</span>
            <strong>{formatInServiceDate(asset.inServiceDate)}</strong>
          </div>
        </div>

        <section className={styles.ordersSection}>
          <div className={styles.ordersHeader}>
            <strong>Đơn hàng liên quan</strong>
            <span>{props.relatedOrders.length} đơn</span>
          </div>

          {!props.relatedOrders.length ? (
            <div className={styles.emptyOrders}>Chưa có đơn hàng nào cho tài sản này.</div>
          ) : (
            <div className={styles.ordersList}>
              {props.relatedOrders.slice(0, 20).map((order: IAssetOrderLink) => (
                <article key={order.orderId} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <strong>{order.orderCode}</strong>
                    <AppButton
                      variant="ghost"
                      onClick={(): void =>
                        props.onOpenOrder({
                          orderId: order.orderId,
                          orderCode: order.orderCode,
                          buyerName: order.buyerName,
                          purchaseDate: order.purchaseDate,
                          totalAmount: 0,
                          currentStep: 'Thanh toán',
                          paymentStatus: order.paymentStatus,
                          handoverStatus: order.handoverStatus,
                          items: []
                        })
                      }
                    >
                      Xem đơn
                    </AppButton>
                  </div>
                  <div className={styles.orderRow}>
                    <span>Người mua</span>
                    <strong>{order.buyerName}</strong>
                  </div>
                  <div className={styles.orderRow}>
                    <span>Số lượng</span>
                    <strong>{order.quantity}</strong>
                  </div>
                  <div className={styles.orderRow}>
                    <span>Thanh toán</span>
                    <StatusBadge
                      label={order.paymentStatus}
                      variant={getStatusBadgeVariantFromOrderStatus(order.paymentStatus, 'payment')}
                    />
                  </div>
                  <div className={styles.orderRow}>
                    <span>Bàn giao</span>
                    <StatusBadge
                      label={order.handoverStatus}
                      variant={getStatusBadgeVariantFromOrderStatus(order.handoverStatus, 'handover')}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
