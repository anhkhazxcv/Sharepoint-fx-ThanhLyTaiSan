import * as React from 'react';
import { ConfirmDialog, DialogSection } from '../common';
import { exportTransactionsToExcel } from '../services/transactionExportService';
import { buildTransactionExportRows, filterOrdersByDateRange } from './utils/transactionExportUtils';
import { useToast } from '../ToastProvider';
import type { IOrderDetail } from './types';
import styles from './AdminTransactionExportDialog.module.scss';

export interface IAdminTransactionExportDialogProps {
  isOpen: boolean;
  orders: IOrderDetail[];
  onClose: () => void;
}

function parseDateInputValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsedDate: Date = new Date(value);
  return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

export function AdminTransactionExportDialog(props: IAdminTransactionExportDialogProps): React.ReactElement {
  const { showToast } = useToast();
  const [fromDateInput, setFromDateInput] = React.useState<string>('');
  const [toDateInput, setToDateInput] = React.useState<string>('');
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!props.isOpen) {
      setFromDateInput('');
      setToDateInput('');
      setIsExporting(false);
    }
  }, [props.isOpen]);

  const fromDate: Date | undefined = React.useMemo(() => parseDateInputValue(fromDateInput), [fromDateInput]);
  const toDate: Date | undefined = React.useMemo(() => parseDateInputValue(toDateInput), [toDateInput]);
  const isRangeInvalid: boolean = !!fromDate && !!toDate && fromDate.getTime() > toDate.getTime();

  const matchedOrders: IOrderDetail[] = React.useMemo(() => {
    if (isRangeInvalid) {
      return [];
    }

    return filterOrdersByDateRange(props.orders, fromDate, toDate);
  }, [props.orders, fromDate, toDate, isRangeInvalid]);

  const matchedRowCount: number = React.useMemo(() => buildTransactionExportRows(matchedOrders).length, [matchedOrders]);

  async function handleExport(): Promise<void> {
    if (isRangeInvalid || !matchedRowCount || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const exportedCount: number = await exportTransactionsToExcel(props.orders, fromDate, toDate);
      showToast('Đã xuất ' + String(exportedCount) + ' dòng giao dịch.', 'success');
      props.onClose();
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : 'Xuất giao dịch thất bại.';
      showToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <ConfirmDialog
      isOpen={props.isOpen}
      title="Xuất giao dịch"
      titleId="admin-transaction-export-dialog-title"
      isBlocking={isExporting}
      onDismiss={props.onClose}
      secondaryAction={{
        label: 'Hủy',
        onClick: props.onClose,
        disabled: isExporting
      }}
      primaryAction={{
        label: 'Xuất giao dịch',
        loadingLabel: 'Đang xuất...',
        onClick: (): void => {
          handleExport().catch(() => {
            // handled in catch
          });
        },
        disabled: isRangeInvalid || !matchedRowCount || isExporting
      }}
    >
      <div className={styles.dateRangeRow}>
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>Từ ngày</span>
          <input
            type="date"
            className={styles.dateInput}
            value={fromDateInput}
            max={toDateInput || undefined}
            disabled={isExporting}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setFromDateInput(event.target.value)}
          />
        </label>

        <label className={styles.dateField}>
          <span className={styles.dateLabel}>Đến ngày</span>
          <input
            type="date"
            className={styles.dateInput}
            value={toDateInput}
            min={fromDateInput || undefined}
            disabled={isExporting}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setToDateInput(event.target.value)}
          />
        </label>
      </div>

      {isRangeInvalid ? (
        <DialogSection warning>Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</DialogSection>
      ) : (
        <DialogSection>
          {matchedRowCount > 0
            ? String(matchedOrders.length) + ' đơn hàng, ' + String(matchedRowCount) + ' dòng sản phẩm phù hợp.'
            : 'Không có giao dịch nào trong khoảng ngày đã chọn.'}
        </DialogSection>
      )}
    </ConfirmDialog>
  );
}
