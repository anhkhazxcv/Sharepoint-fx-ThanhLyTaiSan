import * as React from 'react';
import styles from './PurchaseLimitBadge.module.scss';

export interface IPurchaseLimitBadgeProps {
  purchasedCount: number;
  maxLimit: number;
}

export function PurchaseLimitBadge(props: IPurchaseLimitBadgeProps): React.ReactElement {
  const { purchasedCount, maxLimit } = props;
  const remainingLimit: number = Math.max(maxLimit - purchasedCount, 0);

  return (
    <div className={styles.badge}>
      <span className={styles.label}>Giới hạn mua</span>
      <strong className={styles.value}>Còn {remainingLimit} / {maxLimit}</strong>
      <span className={styles.meta}>Đã đăng ký {purchasedCount} tài sản</span>
    </div>
  );
}
