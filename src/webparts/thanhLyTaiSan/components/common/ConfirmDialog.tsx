import * as React from 'react';
import { AppButton } from './AppButton';
import styles from './ConfirmDialog.module.scss';

export interface IConfirmDialogAction {
  label: string;
  loadingLabel?: string;
  variant?: 'primary' | 'ghost' | 'secondary' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

export interface IConfirmDialogProps {
  isOpen: boolean;
  title: string;
  titleId?: string;
  isBlocking?: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
  primaryAction: IConfirmDialogAction;
  secondaryAction?: IConfirmDialogAction;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.prototype.slice.call(container.querySelectorAll('button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
}

export function ConfirmDialog(props: IConfirmDialogProps): React.ReactElement {
  const titleId: string = props.titleId || 'mag-confirm-dialog-title';
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!props.isOpen || props.isBlocking) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        props.onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.isBlocking, props.isOpen, props.onDismiss]);

  React.useEffect(() => {
    if (!props.isOpen || !cardRef.current) {
      return;
    }

    const focusableElements: HTMLElement[] = getFocusableElements(cardRef.current);

    if (focusableElements.length) {
      focusableElements[0].focus();
    }

    const handleTabKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || !cardRef.current) {
        return;
      }

      const elements: HTMLElement[] = getFocusableElements(cardRef.current);

      if (!elements.length) {
        return;
      }

      const firstElement: HTMLElement = elements[0];
      const lastElement: HTMLElement = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleTabKeyDown);
    return () => window.removeEventListener('keydown', handleTabKeyDown);
  }, [props.isOpen]);

  if (!props.isOpen) {
    return <></>;
  }

  const handleOverlayClick = (): void => {
    if (!props.isBlocking) {
      props.onDismiss();
    }
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={handleOverlayClick}>
      <div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event: React.MouseEvent<HTMLDivElement>): void => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 id={titleId} className={styles.title}>
            {props.title}
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={props.onDismiss}
            disabled={!!props.isBlocking}
            aria-label="Đóng hộp thoại"
          >
            ×
          </button>
        </div>

        {props.children && <div className={styles.body}>{props.children}</div>}

        <div className={styles.footer}>
          {props.secondaryAction && (
            <AppButton
              variant={props.secondaryAction.variant || 'ghost'}
              disabled={!!props.secondaryAction.disabled || !!props.isBlocking}
              onClick={props.secondaryAction.onClick}
            >
              {props.secondaryAction.disabled && props.secondaryAction.loadingLabel
                ? props.secondaryAction.loadingLabel
                : props.secondaryAction.label}
            </AppButton>
          )}
          <AppButton
            variant={props.primaryAction.variant || 'primary'}
            disabled={!!props.primaryAction.disabled || !!props.isBlocking}
            onClick={props.primaryAction.onClick}
          >
            {props.primaryAction.disabled && props.primaryAction.loadingLabel
              ? props.primaryAction.loadingLabel
              : props.primaryAction.label}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
