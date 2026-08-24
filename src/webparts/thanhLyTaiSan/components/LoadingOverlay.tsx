import * as React from 'react';
import styles from './LoadingOverlay.module.scss';

export interface ILoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay(props: ILoadingOverlayProps): React.ReactElement {
  if (!props.visible) {
    return <></>;
  }

  return (
    <div className={styles.overlay} aria-live="assertive" role="status">
      <div className={styles.box}>
        <span className={styles.spinner} />
        <span className={styles.message}>{props.message || 'Đang xử lý...'}</span>
      </div>
    </div>
  );
}
