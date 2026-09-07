import * as React from 'react';
import { IconButton } from '@fluentui/react';
import type { IOrderDetail } from './types';
import { formatCurrency, formatDate } from './utils/format';
import { scrollToElement } from '../utils/scrollToElement';
import {
  AppButton,
  ConfirmDialog,
  DataTable,
  DialogSection,
  EmptyState,
  PageHeader,
  PaginationBar,
  StatusBadge,
  getStatusBadgeVariantFromOrderStatus,
  type IDataTableColumn
} from '../common';
import { AdminBulkActionBar } from './admin/AdminBulkActionBar';
import { AdminOrderFilters } from './admin/AdminOrderFilters';
import styles from './AdminTransactionPage.module.scss';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50];
const AdminTransactionExportDialog = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'admin-transaction-export-dialog' */ './AdminTransactionExportDialog');
  return { default: module.AdminTransactionExportDialog };
});

type TAdminBulkActionType = 'payment' | 'handover';

export interface IAdminTransactionPageProps {
  orders: IOrderDetail[];
  onOpenOrder: (order: IOrderDetail) => void;
  onConfirmBulkPayment: (orderIds: string[]) => Promise<string[]>;
  onConfirmBulkHandover: (orderIds: string[]) => Promise<string[]>;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
  isProcessing?: boolean;
}

interface IInvalidSelectionSummary {
  key: string;
  count: number;
  label: string;
}

interface IAdminBulkDialogState {
  actionType: TAdminBulkActionType;
  selectedCount: number;
  validOrderIds: string[];
  invalidSummaries: IInvalidSelectionSummary[];
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function isSelectionLocked(order: IOrderDetail): boolean {
  return order.paymentStatus === 'Đã thanh toán' && order.handoverStatus === 'Đã bàn giao';
}

function getInvalidReasonKey(actionType: TAdminBulkActionType, order: IOrderDetail): string {
  if (order.handoverStatus === 'Đã bàn giao') {
    return 'alreadyHandedOver';
  }

  if (actionType === 'payment') {
    if (order.paymentStatus === 'Đã thanh toán') {
      return 'alreadyPaid';
    }

    return 'unknown';
  }

  if (order.paymentStatus !== 'Đã thanh toán') {
    return 'paymentPending';
  }

  return 'unknown';
}

function getInvalidReasonLabel(actionType: TAdminBulkActionType, reasonKey: string): string {
  if (reasonKey === 'alreadyHandedOver') {
    return 'đơn đã bàn giao';
  }

  if (actionType === 'payment' && reasonKey === 'alreadyPaid') {
    return 'đơn đã xác nhận';
  }

  if (actionType === 'handover' && reasonKey === 'paymentPending') {
    return 'đơn chưa xác nhận thanh toán';
  }

  return 'đơn không hợp lệ';
}

function isOrderValidForAction(actionType: TAdminBulkActionType, order: IOrderDetail): boolean {
  if (actionType === 'payment') {
    return order.paymentStatus !== 'Đã thanh toán' && order.handoverStatus !== 'Đã bàn giao';
  }

  return order.paymentStatus === 'Đã thanh toán' && order.handoverStatus !== 'Đã bàn giao';
}

function buildBulkDialogState(actionType: TAdminBulkActionType, orders: IOrderDetail[]): IAdminBulkDialogState {
  const validOrderIds: string[] = [];
  const invalidReasonCounts: Record<string, number> = {};

  orders.forEach((order: IOrderDetail): void => {
    if (isOrderValidForAction(actionType, order)) {
      validOrderIds.push(order.orderId);
      return;
    }

    const reasonKey: string = getInvalidReasonKey(actionType, order);
    invalidReasonCounts[reasonKey] = (invalidReasonCounts[reasonKey] || 0) + 1;
  });

  return {
    actionType,
    selectedCount: orders.length,
    validOrderIds,
    invalidSummaries: Object.keys(invalidReasonCounts).map((reasonKey: string): IInvalidSelectionSummary => {
      return {
        key: reasonKey,
        count: invalidReasonCounts[reasonKey],
        label: getInvalidReasonLabel(actionType, reasonKey)
      };
    })
  };
}

export function AdminTransactionPage(props: IAdminTransactionPageProps): React.ReactElement {
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('');
  const [handoverFilter, setHandoverFilter] = React.useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
  const [bulkDialogState, setBulkDialogState] = React.useState<IAdminBulkDialogState | undefined>(undefined);
  const [deleteTargetOrderId, setDeleteTargetOrderId] = React.useState<string | undefined>(undefined);
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState<boolean>(false);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const listSectionRef = React.useRef<HTMLElement>(null);

  const paymentStatuses: string[] = React.useMemo(() => {
    return props.orders
      .map((order: IOrderDetail) => order.paymentStatus)
      .filter((value: string, index: number, values: string[]) => !!value && values.indexOf(value) === index);
  }, [props.orders]);

  const handoverStatuses: string[] = React.useMemo(() => {
    return props.orders
      .map((order: IOrderDetail) => order.handoverStatus)
      .filter((value: string, index: number, values: string[]) => !!value && values.indexOf(value) === index);
  }, [props.orders]);

  const filteredOrders: IOrderDetail[] = React.useMemo(() => {
    const normalizedSearch: string = normalizeValue(searchValue);

    return props.orders.filter((order: IOrderDetail) => {
      const matchesCode: boolean = !normalizedSearch || normalizeValue(order.orderCode).indexOf(normalizedSearch) >= 0;
      const matchesPayment: boolean = !paymentFilter || order.paymentStatus === paymentFilter;
      const matchesHandover: boolean = !handoverFilter || order.handoverStatus === handoverFilter;

      return matchesCode && matchesPayment && matchesHandover;
    });
  }, [handoverFilter, paymentFilter, props.orders, searchValue]);

  const totalPages: number = Math.max(Math.ceil(filteredOrders.length / pageSize), 1);
  const paginatedOrders: IOrderDetail[] = React.useMemo(() => {
    const startIndex: number = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredOrders, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [handoverFilter, paymentFilter, searchValue]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function scrollToAdminList(): void {
    window.requestAnimationFrame((): void => {
      scrollToElement(listSectionRef.current ?? undefined);
    });
  }

  function handlePageSizeChange(nextPageSize: number): void {
    setPageSize(nextPageSize);
    setCurrentPage(1);
    scrollToAdminList();
  }

  function goToPreviousPage(): void {
    if (currentPage <= 1) {
      return;
    }

    setCurrentPage(currentPage - 1);
    scrollToAdminList();
  }

  function goToNextPage(): void {
    if (currentPage >= totalPages) {
      return;
    }

    setCurrentPage(currentPage + 1);
    scrollToAdminList();
  }

  const selectedOrderIdSet: Set<string> = React.useMemo(() => {
    return new Set<string>(selectedOrderIds);
  }, [selectedOrderIds]);

  const selectableFilteredOrders: IOrderDetail[] = React.useMemo(() => {
    return filteredOrders.filter((order: IOrderDetail): boolean => !isSelectionLocked(order));
  }, [filteredOrders]);

  const allSelectableFilteredOrdersSelected: boolean = React.useMemo(() => {
    return selectableFilteredOrders.length > 0 && selectableFilteredOrders.every((order: IOrderDetail): boolean => selectedOrderIdSet.has(order.orderId));
  }, [selectableFilteredOrders, selectedOrderIdSet]);

  React.useEffect(() => {
    setSelectedOrderIds((prevSelectedOrderIds: string[]): string[] => {
      return prevSelectedOrderIds.filter((orderId: string): boolean => {
        return props.orders.some((order: IOrderDetail): boolean => order.orderId === orderId && !isSelectionLocked(order));
      });
    });
  }, [props.orders]);

  function handleOrderSelectionChange(orderId: string): void {
    if (props.isProcessing) {
      return;
    }

    setSelectedOrderIds((prevSelectedOrderIds: string[]): string[] => {
      if (prevSelectedOrderIds.indexOf(orderId) >= 0) {
        return prevSelectedOrderIds.filter((selectedOrderId: string): boolean => selectedOrderId !== orderId);
      }

      return prevSelectedOrderIds.concat(orderId);
    });
  }

  function handleSelectAllFilteredOrders(): void {
    if (props.isProcessing || !selectableFilteredOrders.length) {
      return;
    }

    setSelectedOrderIds((prevSelectedOrderIds: string[]): string[] => {
      if (allSelectableFilteredOrdersSelected) {
        return prevSelectedOrderIds.filter((orderId: string): boolean => {
          return !selectableFilteredOrders.some((order: IOrderDetail): boolean => order.orderId === orderId);
        });
      }

      const nextSelection: string[] = prevSelectedOrderIds.slice();

      selectableFilteredOrders.forEach((order: IOrderDetail): void => {
        if (nextSelection.indexOf(order.orderId) < 0) {
          nextSelection.push(order.orderId);
        }
      });

      return nextSelection;
    });
  }

  function openBulkDialog(actionType: TAdminBulkActionType): void {
    const selectedOrders: IOrderDetail[] = props.orders.filter((order: IOrderDetail): boolean => selectedOrderIdSet.has(order.orderId));

    if (!selectedOrders.length || props.isProcessing) {
      return;
    }

    setBulkDialogState(buildBulkDialogState(actionType, selectedOrders));
  }

  function closeBulkDialog(): void {
    if (props.isProcessing) {
      return;
    }

    setBulkDialogState(undefined);
  }

  function handleBulkConfirm(): void {
    if (!bulkDialogState || !bulkDialogState.validOrderIds.length || props.isProcessing) {
      return;
    }

    const confirmHandler =
      bulkDialogState.actionType === 'payment' ? props.onConfirmBulkPayment : props.onConfirmBulkHandover;

    confirmHandler(bulkDialogState.validOrderIds).then((confirmedOrderIds: string[]): void => {
      setSelectedOrderIds((prevSelectedOrderIds: string[]): string[] => {
        return prevSelectedOrderIds.filter((orderId: string): boolean => confirmedOrderIds.indexOf(orderId) < 0);
      });
      setBulkDialogState(undefined);
    }, (): void => undefined);
  }

  function requestDeleteOrder(order: IOrderDetail): void {
    if (props.isProcessing || order.paymentStatus === 'Đã thanh toán') {
      return;
    }

    setDeleteTargetOrderId(order.orderId);
  }

  function closeDeleteDialog(): void {
    if (props.isProcessing) {
      return;
    }

    setDeleteTargetOrderId(undefined);
  }

  function confirmDeleteOrder(): void {
    if (!deleteTargetOrderId || props.isProcessing) {
      return;
    }

    props.onDeleteOrder(deleteTargetOrderId).then((isDeleted: boolean): void => {
      if (isDeleted) {
        setSelectedOrderIds((prevSelectedOrderIds: string[]): string[] => {
          return prevSelectedOrderIds.filter((orderId: string): boolean => orderId !== deleteTargetOrderId);
        });
        setDeleteTargetOrderId(undefined);
      }
    }, (): void => undefined);
  }

  const tableColumns: IDataTableColumn<IOrderDetail>[] = React.useMemo(
    () => [
      {
        key: 'select',
        header: '',
        headerClassName: styles.checkboxCell,
        cellClassName: styles.checkboxCell,
        renderHeader: (): React.ReactElement => (
          <input
            type="checkbox"
            className={styles.bulkCheckbox}
            checked={allSelectableFilteredOrdersSelected}
            disabled={!selectableFilteredOrders.length || !!props.isProcessing}
            onChange={handleSelectAllFilteredOrders}
            aria-label="Chọn tất cả đơn hợp lệ"
          />
        ),
        render: (order: IOrderDetail): React.ReactElement => (
          <input
            type="checkbox"
            className={styles.bulkCheckbox}
            checked={selectedOrderIdSet.has(order.orderId)}
            disabled={isSelectionLocked(order) || !!props.isProcessing}
            onChange={(): void => handleOrderSelectionChange(order.orderId)}
            aria-label={'Chọn đơn ' + order.orderCode}
          />
        )
      },
      {
        key: 'orderCode',
        header: 'Mã đơn',
        cellClassName: styles.codeCell,
        render: (order: IOrderDetail): React.ReactElement => (
          <button type="button" className={styles.orderCodeLink} onClick={(): void => props.onOpenOrder(order)}>
            {order.orderCode}
          </button>
        )
      },
      {
        key: 'buyerName',
        header: 'Người mua',
        render: (order: IOrderDetail) => order.buyerName
      },
      {
        key: 'buyerEmail',
        header: 'Email',
        cellClassName: styles.emailCell,
        render: (order: IOrderDetail) => order.buyerEmail || '-'
      },
      {
        key: 'purchaseDate',
        header: 'Ngày mua',
        render: (order: IOrderDetail) => formatDate(order.purchaseDate)
      },
      {
        key: 'totalAmount',
        header: 'Tổng tiền',
        render: (order: IOrderDetail) => formatCurrency(order.totalAmount)
      },
      {
        key: 'paymentStatus',
        header: 'Thanh toán',
        render: (order: IOrderDetail): React.ReactElement => (
          <StatusBadge
            label={order.paymentStatus}
            variant={getStatusBadgeVariantFromOrderStatus(order.paymentStatus, 'payment')}
          />
        )
      },
      {
        key: 'handoverStatus',
        header: 'Bàn giao',
        render: (order: IOrderDetail): React.ReactElement => (
          <StatusBadge
            label={order.handoverStatus}
            variant={getStatusBadgeVariantFromOrderStatus(order.handoverStatus, 'handover')}
          />
        )
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (order: IOrderDetail): React.ReactElement => (
          <div className={styles.actionCell}>
            {order.paymentStatus !== 'Đã thanh toán' && (
              <IconButton
                iconProps={{ iconName: 'Delete' }}
                title="Xóa đơn"
                ariaLabel={'Xóa đơn ' + order.orderCode}
                disabled={!!props.isProcessing}
                onClick={(): void => requestDeleteOrder(order)}
                className={styles.deleteIconButton}
              />
            )}
          </div>
        )
      }
    ],
    [
      allSelectableFilteredOrdersSelected,
      handleSelectAllFilteredOrders,
      handleOrderSelectionChange,
      props.isProcessing,
      props.onOpenOrder,
      requestDeleteOrder,
      selectableFilteredOrders.length,
      selectedOrderIdSet
    ]
  );

  if (!props.orders.length) {
    return (
      <section className={styles.page}>
        <EmptyState
          title="Chưa có giao dịch nào"
          description="Danh sách giao dịch admin sẽ hiển thị tại đây khi SharePoint có dữ liệu đơn hàng."
        />
      </section>
    );
  }

  const exportButton: React.ReactElement = (
    <AppButton variant="secondary" onClick={(): void => setIsExportDialogOpen(true)}>
      Xuất giao dịch
    </AppButton>
  );

  return (
    <section className={styles.card} ref={listSectionRef}>
      <PageHeader
        title="Quản lý giao dịch admin"
        subtitle="Theo dõi toàn bộ đơn hàng và lọc theo mã đơn, thanh toán, bàn giao."
        meta={<span className={styles.summaryChip}>Tổng giao dịch: {filteredOrders.length}</span>}
        actions={exportButton}
      />

      <AdminOrderFilters
        searchValue={searchValue}
        paymentFilter={paymentFilter}
        handoverFilter={handoverFilter}
        paymentStatuses={paymentStatuses}
        handoverStatuses={handoverStatuses}
        onSearchChange={setSearchValue}
        onPaymentFilterChange={setPaymentFilter}
        onHandoverFilterChange={setHandoverFilter}
      />

      <AdminBulkActionBar
        allSelectableSelected={allSelectableFilteredOrdersSelected}
        selectableCount={selectableFilteredOrders.length}
        selectedCount={selectedOrderIds.length}
        isProcessing={props.isProcessing}
        onSelectAll={handleSelectAllFilteredOrders}
        onConfirmPayment={(): void => openBulkDialog('payment')}
        onConfirmHandover={(): void => openBulkDialog('handover')}
      />

      {!filteredOrders.length ? (
        <div className={styles.noResult}>Không tìm thấy giao dịch phù hợp với điều kiện lọc.</div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <DataTable
              items={paginatedOrders}
              columns={tableColumns}
              getRowKey={(order: IOrderDetail) => order.orderId}
              getRowClassName={(order: IOrderDetail) => (isSelectionLocked(order) ? styles.disabledRow : undefined)}
              tableClassName={styles.adminTable}
              ariaLabel="Danh sách giao dịch admin"
            />
          </div>

          <div className={styles.mobileList}>
            {paginatedOrders.map((order: IOrderDetail): React.ReactElement => (
              <article key={order.orderId} className={`${styles.mobileCard} ${isSelectionLocked(order) ? styles.disabledCard : ''}`}>
                <div className={styles.mobileHeader}>
                  <div className={styles.mobileHeaderInfo}>
                    <input
                      type="checkbox"
                      className={styles.bulkCheckbox}
                      checked={selectedOrderIdSet.has(order.orderId)}
                      disabled={isSelectionLocked(order) || !!props.isProcessing}
                      onChange={(): void => handleOrderSelectionChange(order.orderId)}
                      aria-label={'Chọn đơn ' + order.orderCode}
                    />
                    <button type="button" className={styles.orderCodeLink} onClick={(): void => props.onOpenOrder(order)}>
                      {order.orderCode}
                    </button>
                  </div>
                  <div className={styles.mobileActionRow}>
                    {order.paymentStatus !== 'Đã thanh toán' && (
                      <IconButton
                        iconProps={{ iconName: 'Delete' }}
                        title="Xóa đơn"
                        ariaLabel={'Xóa đơn ' + order.orderCode}
                        disabled={!!props.isProcessing}
                        onClick={(): void => requestDeleteOrder(order)}
                        className={styles.deleteIconButton}
                      />
                    )}
                  </div>
                </div>

                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Người mua</span>
                  <strong>{order.buyerName}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Email</span>
                  <strong className={styles.emailCell}>{order.buyerEmail || '-'}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Ngày mua</span>
                  <strong>{formatDate(order.purchaseDate)}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Tổng tiền</span>
                  <strong>{formatCurrency(order.totalAmount)}</strong>
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Thanh toán</span>
                  <StatusBadge
                    label={order.paymentStatus}
                    variant={getStatusBadgeVariantFromOrderStatus(order.paymentStatus, 'payment')}
                  />
                </div>
                <div className={styles.mobileRow}>
                  <span className={styles.mobileLabel}>Bàn giao</span>
                  <StatusBadge
                    label={order.handoverStatus}
                    variant={getStatusBadgeVariantFromOrderStatus(order.handoverStatus, 'handover')}
                  />
                </div>
              </article>
            ))}
          </div>

          <PaginationBar
            totalItems={filteredOrders.length}
            currentPage={currentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={!!bulkDialogState}
        title={
          bulkDialogState
            ? (bulkDialogState.actionType === 'payment' ? 'Xác nhận thanh toán ' : 'Xác nhận bàn giao ') +
              String(bulkDialogState.selectedCount) +
              ' đơn hàng'
            : ''
        }
        titleId="admin-bulk-dialog-title"
        isBlocking={!!props.isProcessing}
        onDismiss={closeBulkDialog}
        secondaryAction={{
          label: 'Huỷ',
          onClick: closeBulkDialog,
          disabled: !!props.isProcessing
        }}
        primaryAction={{
          label: 'Chỉ xác nhận đơn hợp lệ',
          loadingLabel: 'Đang xử lý...',
          onClick: handleBulkConfirm,
          disabled: !bulkDialogState?.validOrderIds.length || !!props.isProcessing
        }}
      >
        {bulkDialogState && (
          <>
            <DialogSection>
              <strong>Có thể xác nhận:</strong> {bulkDialogState.validOrderIds.length} đơn
            </DialogSection>
            <DialogSection>
              <strong>Không hợp lệ:</strong>{' '}
              {bulkDialogState.invalidSummaries.length
                ? bulkDialogState.invalidSummaries
                    .map((summary: IInvalidSelectionSummary) => summary.count + ' ' + summary.label)
                    .join(', ')
                : 'Không có đơn không hợp lệ trong lựa chọn hiện tại.'}
            </DialogSection>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={!!deleteTargetOrderId}
        title="Xác nhận xóa đơn hàng"
        titleId="admin-delete-dialog-title"
        isBlocking={!!props.isProcessing}
        onDismiss={closeDeleteDialog}
        secondaryAction={{
          label: 'Huỷ',
          onClick: closeDeleteDialog,
          disabled: !!props.isProcessing
        }}
        primaryAction={{
          label: 'Xác nhận xóa',
          loadingLabel: 'Đang xóa...',
          variant: 'danger',
          onClick: confirmDeleteOrder,
          disabled: !!props.isProcessing
        }}
      >
        Bạn có chắc chắn muốn xóa đơn hàng này không? Chỉ có thể xóa đơn chưa được xác nhận thanh toán.
      </ConfirmDialog>

      {isExportDialogOpen && (
        <React.Suspense fallback={<></>}>
          <AdminTransactionExportDialog
            isOpen={isExportDialogOpen}
            orders={filteredOrders}
            onClose={(): void => setIsExportDialogOpen(false)}
          />
        </React.Suspense>
      )}
    </section>
  );
}
