import * as React from 'react';
import styles from './StatusBadge.module.scss';

export type TStatusBadgeVariant = 'success' | 'warning' | 'neutral' | 'danger';

export interface IStatusBadgeProps {
  label: string;
  variant?: TStatusBadgeVariant;
  dot?: boolean;
  className?: string;
}

export function StatusBadge(props: IStatusBadgeProps): React.ReactElement {
  const variant: TStatusBadgeVariant = props.variant || 'neutral';
  const classNames: string = [styles.badge, styles[variant], props.className || ''].filter(Boolean).join(' ');

  return (
    <span className={classNames}>
      {props.dot && <span className={styles.dot} aria-hidden="true" />}
      {props.label}
    </span>
  );
}

export function getStatusBadgeVariantFromOrderStatus(
  status: string,
  type: 'payment' | 'handover'
): TStatusBadgeVariant {
  if (type === 'payment') {
    return status === 'Đã thanh toán' ? 'success' : 'warning';
  }

  return status === 'Đã bàn giao' ? 'success' : 'neutral';
}
