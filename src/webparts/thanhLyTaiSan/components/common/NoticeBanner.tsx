import * as React from 'react';
import styles from './NoticeBanner.module.scss';

export type TNoticeBannerVariant = 'warning' | 'error' | 'info' | 'success';

export interface INoticeBannerProps {
  variant?: TNoticeBannerVariant;
  children: React.ReactNode;
  className?: string;
}

export function NoticeBanner(props: INoticeBannerProps): React.ReactElement {
  const variant: TNoticeBannerVariant = props.variant || 'warning';
  const classNames: string = [styles.banner, styles[variant], props.className || ''].filter(Boolean).join(' ');

  return <div className={classNames} role="status">{props.children}</div>;
}

export function DialogSection(props: { children: React.ReactNode; warning?: boolean }): React.ReactElement {
  const classNames: string = [styles.section, props.warning ? styles.sectionWarning : ''].filter(Boolean).join(' ');
  return <div className={classNames}>{props.children}</div>;
}
