import * as React from 'react';
import styles from './AppButton.module.scss';

export type TAppButtonVariant = 'primary' | 'ghost' | 'secondary' | 'danger';

export interface IAppButtonProps {
  variant?: TAppButtonVariant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function AppButton(props: IAppButtonProps): React.ReactElement {
  const variant: TAppButtonVariant = props.variant || 'primary';
  const classNames: string = [styles.button, styles[variant], props.className || ''].filter(Boolean).join(' ');

  return (
    <button type={props.type || 'button'} className={classNames} disabled={!!props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}
