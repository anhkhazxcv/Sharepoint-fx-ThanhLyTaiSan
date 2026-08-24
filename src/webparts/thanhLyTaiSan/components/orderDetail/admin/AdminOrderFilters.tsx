import * as React from 'react';
import styles from './AdminOrderFilters.module.scss';

export interface IAdminOrderFiltersProps {
  searchValue: string;
  paymentFilter: string;
  handoverFilter: string;
  paymentStatuses: string[];
  handoverStatuses: string[];
  onSearchChange: (value: string) => void;
  onPaymentFilterChange: (value: string) => void;
  onHandoverFilterChange: (value: string) => void;
}

export function AdminOrderFilters(props: IAdminOrderFiltersProps): React.ReactElement {
  return (
    <div className={styles.filterPanel}>
      <label className={styles.filterField}>
        <span className={styles.filterLabel}>Tìm theo mã đơn</span>
        <input
          type="text"
          className={styles.input}
          placeholder="Nhập mã đơn hàng"
          value={props.searchValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => props.onSearchChange(event.target.value)}
        />
      </label>

      <label className={styles.filterField}>
        <span className={styles.filterLabel}>Trạng thái thanh toán</span>
        <select
          className={styles.select}
          value={props.paymentFilter}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) => props.onPaymentFilterChange(event.target.value)}
        >
          <option value="">Tất cả</option>
          {props.paymentStatuses.map((status: string) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterField}>
        <span className={styles.filterLabel}>Trạng thái bàn giao</span>
        <select
          className={styles.select}
          value={props.handoverFilter}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) => props.onHandoverFilterChange(event.target.value)}
        >
          <option value="">Tất cả</option>
          {props.handoverStatuses.map((status: string) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
