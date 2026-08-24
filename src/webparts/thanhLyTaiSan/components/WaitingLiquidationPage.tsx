import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react';
import logoMag from '../assets/logoMAG.png';
import { AppButton, ConfirmDialog, NoticeBanner } from './common';
import styles from './WaitingLiquidationPage.module.scss';

export interface IWaitingLiquidationPageProps {
  isAdmin: boolean;
  isCheckingStatus: boolean;
  isOpeningSession: boolean;
  isConfirmDialogOpen: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onRequestOpenSession: () => void;
  onCancelOpenSession: () => void;
  onConfirmOpenSession: () => void;
  onEnterAdminPreview?: () => void;
}

export function WaitingLiquidationPage(props: IWaitingLiquidationPageProps): React.ReactElement {
  const isBusy: boolean = props.isCheckingStatus || props.isOpeningSession;

  return (
    <section className={styles.waitPage}>
      <div className={styles.waitCard}>
        <img className={styles.logo} src={logoMag} alt="Logo MAG" />
        <h1 className={styles.title}>HỆ THỐNG THANH LÝ TÀI SẢN MAG</h1>
        <h2 className={styles.notice}>Phiên thanh lý chưa bắt đầu</h2>
        <p className={styles.description}>
          Chương trình thanh lý tài sản hiện chưa được mở. Vui lòng chờ thông báo chính thức từ công ty MAG.
        </p>

        <div className={styles.visualWrap} aria-hidden="true">
          <div className={styles.clockIcon}>
            <svg viewBox="0 0 24 24" role="presentation">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <Spinner
            size={SpinnerSize.medium}
            label={props.isOpeningSession ? 'Đang mở phiên thanh lý...' : 'Đang kiểm tra trạng thái phiên thanh lý...'}
          />
        </div>

        {!!props.errorMessage && (
          <div className={styles.messageBar}>
            <NoticeBanner variant="error" className={styles.bannerInline}>{props.errorMessage}</NoticeBanner>
          </div>
        )}

        <div className={styles.actionRow}>
          <AppButton variant="primary" onClick={props.onRetry} disabled={isBusy}>
            Kiểm tra lại
          </AppButton>
          {props.isAdmin && !!props.onEnterAdminPreview && (
            <AppButton variant="primary" onClick={props.onEnterAdminPreview} disabled={isBusy}>
              Vào mua hàng (Admin)
            </AppButton>
          )}
          {props.isAdmin && (
            <AppButton variant="ghost" onClick={props.onRequestOpenSession} disabled={isBusy}>
              Mở phiên thanh lý
            </AppButton>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={props.isConfirmDialogOpen}
        title="Xác nhận mở phiên thanh lý"
        isBlocking={props.isOpeningSession}
        onDismiss={props.onCancelOpenSession}
        secondaryAction={{
          label: 'Hủy',
          onClick: props.onCancelOpenSession,
          disabled: props.isOpeningSession
        }}
        primaryAction={{
          label: 'Xác nhận',
          loadingLabel: 'Đang mở phiên...',
          onClick: props.onConfirmOpenSession,
          disabled: props.isOpeningSession
        }}
      >
        Bạn có chắc chắn muốn mở phiên thanh lý cho toàn hệ thống không?
      </ConfirmDialog>
    </section>
  );
}
