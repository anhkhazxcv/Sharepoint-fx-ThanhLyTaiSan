import * as React from 'react';
import type { TProcessStep } from './types';
import { AppButton } from '../common';
import styles from './ActionToolbar.module.scss';

export interface IActionToolbarProps {
  currentStep: TProcessStep;
  paymentStatus: string;
  handoverStatus: string;
  isAdmin: boolean;
  isProcessing?: boolean;
  onConfirmPayment: () => void;
  onConfirmHandover: () => void;
}

export function ActionToolbar(props: IActionToolbarProps): React.ReactElement {
  const isPaymentStep: boolean = props.isAdmin && props.currentStep === 'Thanh toán';
  const canShowHandoverButton: boolean = props.isAdmin && props.paymentStatus === 'Đã thanh toán';
  const isHandoverDisabled: boolean = props.handoverStatus === 'Đã bàn giao' || !!props.isProcessing;

  return (
    <div className={styles.toolbar}>
      {isPaymentStep && (
        <AppButton variant="secondary" onClick={props.onConfirmPayment} disabled={!!props.isProcessing}>
          {props.isProcessing ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
        </AppButton>
      )}
      {canShowHandoverButton && (
        <AppButton variant="primary" onClick={props.onConfirmHandover} disabled={isHandoverDisabled}>
          {props.isProcessing ? 'Đang xử lý...' : 'Xác nhận bàn giao'}
        </AppButton>
      )}
    </div>
  );
}
