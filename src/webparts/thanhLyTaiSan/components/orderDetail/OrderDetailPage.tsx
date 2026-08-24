import * as React from 'react';
import { ProcessStepper } from './ProcessStepper';
import { OrderSummaryCard } from './OrderSummaryCard';
import { ActionToolbar } from './ActionToolbar';
import { PaymentManagementTable } from './PaymentManagementTable';
import { AppButton } from '../common';
import type { IOrderDetail } from './types';
import styles from './OrderDetailPage.module.scss';

export interface IOrderDetailPageProps {
  orderDetail?: IOrderDetail;
  isAdmin?: boolean;
  isActionProcessing?: boolean;
  onBack?: () => void;
  onConfirmPayment?: (orderId: string) => void;
  onConfirmHandover?: (orderId: string) => void;
}

export function OrderDetailPage(props: IOrderDetailPageProps): React.ReactElement {
  const loadingTimer = React.useRef<number | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(function () {
    loadingTimer.current = window.setTimeout(function () {
      setIsLoading(false);
    }, 300);

    return function () {
      if (loadingTimer.current) {
        window.clearTimeout(loadingTimer.current);
      }
    };
  }, []);

  if (!props.orderDetail) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonTitle}>Không có dữ liệu đơn hàng.</div>
      </div>
    );
  }

  const orderDetail: IOrderDetail = props.orderDetail;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSummary} />
        <div className={styles.skeletonLayout}>
          <div className={styles.skeletonMain} />
          <div className={styles.skeletonSide} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ProcessStepper currentStep={orderDetail.currentStep} />

      <header className={styles.pageHeader}>
        {props.onBack && (
          <AppButton variant="ghost" onClick={props.onBack}>
            Quay lại danh sách đơn
          </AppButton>
        )}
        <h1 className={styles.title}>Chi tiết Đơn hàng: {orderDetail.orderCode}</h1>
      </header>

      <OrderSummaryCard
        buyerName={orderDetail.buyerName}
        purchaseDate={orderDetail.purchaseDate}
        totalAmount={orderDetail.totalAmount}
      />

      <div className={styles.toolbarRow}>
        <ActionToolbar
          currentStep={orderDetail.currentStep}
          paymentStatus={orderDetail.paymentStatus}
          handoverStatus={orderDetail.handoverStatus}
          isAdmin={!!props.isAdmin}
          isProcessing={!!props.isActionProcessing}
          onConfirmPayment={function (): void {
            if (props.onConfirmPayment) {
              props.onConfirmPayment(orderDetail.orderId);
            }
          }}
          onConfirmHandover={function (): void {
            if (props.onConfirmHandover) {
              props.onConfirmHandover(orderDetail.orderId);
            }
          }}
        />
      </div>

      <div className={styles.tableSection}>
        <PaymentManagementTable items={orderDetail.items} />
      </div>
    </div>
  );
}
