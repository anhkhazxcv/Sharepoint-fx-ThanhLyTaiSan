import * as React from 'react';
import { AppButton } from '../../common';
import styles from './AdminBulkActionBar.module.scss';

export interface IAdminBulkActionBarProps {
  allSelectableSelected: boolean;
  selectableCount: number;
  selectedCount: number;
  isProcessing?: boolean;
  onSelectAll: () => void;
  onConfirmPayment: () => void;
  onConfirmHandover: () => void;
}

export function AdminBulkActionBar(props: IAdminBulkActionBarProps): React.ReactElement {
  return (
    <div className={styles.bulkActionBar}>
      <label className={styles.bulkSelectLabel}>
        <input
          type="checkbox"
          className={styles.bulkCheckbox}
          checked={props.allSelectableSelected}
          disabled={!props.selectableCount || !!props.isProcessing}
          onChange={props.onSelectAll}
        />
        <span>Chọn tất cả đơn hợp lệ trong danh sách</span>
      </label>

      <div className={styles.bulkActionMeta}>
        {props.selectedCount
          ? 'Đã chọn ' + String(props.selectedCount) + ' đơn hàng'
          : 'Chọn nhiều đơn để xác nhận nhanh hơn'}
      </div>

      <div className={styles.bulkActionButtons}>
        <AppButton variant="primary" disabled={!props.selectedCount || !!props.isProcessing} onClick={props.onConfirmPayment}>
          Xác nhận thanh toán
        </AppButton>
        <AppButton variant="secondary" disabled={!props.selectedCount || !!props.isProcessing} onClick={props.onConfirmHandover}>
          Xác nhận bàn giao
        </AppButton>
      </div>
    </div>
  );
}
