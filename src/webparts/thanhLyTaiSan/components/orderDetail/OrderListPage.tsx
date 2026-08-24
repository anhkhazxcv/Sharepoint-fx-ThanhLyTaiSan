import * as React from 'react';
import type { IOrderDetail } from './types';
import { formatCurrency, formatDate } from './utils/format';
import { AppButton, DataTable, EmptyState, PageHeader, StatusBadge, getStatusBadgeVariantFromOrderStatus, type IDataTableColumn } from '../common';
import styles from './OrderListPage.module.scss';

export interface IOrderListPageProps {
  orders: IOrderDetail[];
  onOpenOrder: (order: IOrderDetail) => void;
}

export function OrderListPage(props: IOrderListPageProps): React.ReactElement {
  const columns: IDataTableColumn<IOrderDetail>[] = React.useMemo(
    () => [
      {
        key: 'orderCode',
        header: 'Mã đơn',
        cellClassName: styles.codeCell,
        render: (order: IOrderDetail) => order.orderCode
      },
      {
        key: 'buyerName',
        header: 'Người mua',
        render: (order: IOrderDetail) => order.buyerName
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
        render: (order: IOrderDetail) => (
          <StatusBadge
            label={order.paymentStatus}
            variant={getStatusBadgeVariantFromOrderStatus(order.paymentStatus, 'payment')}
          />
        )
      },
      {
        key: 'handoverStatus',
        header: 'Bàn giao',
        render: (order: IOrderDetail) => (
          <StatusBadge
            label={order.handoverStatus}
            variant={getStatusBadgeVariantFromOrderStatus(order.handoverStatus, 'handover')}
          />
        )
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (order: IOrderDetail) => (
          <AppButton variant="ghost" onClick={(): void => props.onOpenOrder(order)}>
            Xem chi tiết
          </AppButton>
        )
      }
    ],
    [props.onOpenOrder]
  );

  if (!props.orders.length) {
    return (
      <section className={styles.page}>
        <EmptyState
          title="Chưa có đơn hàng nào"
          description="Đơn được tạo từ màn đăng ký sẽ xuất hiện trong tab này."
        />
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <PageHeader
        title="Danh sách đơn hàng chờ thanh toán / bàn giao"
        subtitle="Tổng số đơn đang theo dõi"
        meta={<span className={styles.summaryChip}>{props.orders.length} đơn</span>}
      />

      <div className={styles.desktopTable}>
        <DataTable
          items={props.orders}
          columns={columns}
          getRowKey={(order: IOrderDetail) => order.orderId}
          ariaLabel="Danh sách đơn hàng"
        />
      </div>

      <div className={styles.mobileList}>
        {props.orders.map((order: IOrderDetail): React.ReactElement => {
          return (
            <article key={order.orderId} className={styles.mobileCard}>
              <div className={styles.mobileHeader}>
                <strong className={styles.codeCell}>{order.orderCode}</strong>
                <AppButton variant="ghost" onClick={(): void => props.onOpenOrder(order)}>
                  Xem chi tiết
                </AppButton>
              </div>

              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Người mua</span>
                <strong>{order.buyerName}</strong>
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
          );
        })}
      </div>
    </section>
  );
}
