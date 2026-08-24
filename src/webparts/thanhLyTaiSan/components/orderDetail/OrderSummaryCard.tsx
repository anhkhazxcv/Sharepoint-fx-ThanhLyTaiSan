import * as React from 'react';
import styles from './OrderSummaryCard.module.scss';
import { formatCurrency, formatDate } from './utils/format';

export interface IOrderSummaryCardProps {
  buyerName: string;
  purchaseDate: string;
  totalAmount: number;
}

export function OrderSummaryCard(props: IOrderSummaryCardProps): React.ReactElement {
  return (
    <section className={styles.card}>
      <div className={styles.item}>
        <span className={styles.label}>Người mua</span>
        <strong className={styles.value}>{props.buyerName}</strong>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Ngày mua</span>
        <strong className={styles.value}>{formatDate(props.purchaseDate)}</strong>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Tổng tiền</span>
        <strong className={styles.valueAccent}>{formatCurrency(props.totalAmount)}</strong>
      </div>
    </section>
  );
}
