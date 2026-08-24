import * as React from 'react';
import { AppButton } from './AppButton';
import styles from './EmptyState.module.scss';

export interface IEmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState(props: IEmptyStateProps): React.ReactElement {
  return (
    <div className={styles.emptyState}>
      <strong className={styles.title}>{props.title}</strong>
      {props.description && <span className={styles.description}>{props.description}</span>}
      {props.actionLabel && props.onAction && (
        <AppButton variant="secondary" onClick={props.onAction}>
          {props.actionLabel}
        </AppButton>
      )}
    </div>
  );
}
