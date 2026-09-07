import * as React from 'react';
import loadingMAG from '../assets/loadingMAG.gif';
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
        <img src={loadingMAG} alt="" className={styles.spinner} />
        <span className={styles.message}>{props.message || 'Đang xử lý...'}</span>
      </div>
    </div>
  );
}
