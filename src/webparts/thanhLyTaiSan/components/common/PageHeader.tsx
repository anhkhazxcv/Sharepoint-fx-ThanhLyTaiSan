import * as React from 'react';
import styles from './PageHeader.module.scss';

export interface IPageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader(props: IPageHeaderProps): React.ReactElement {
  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <h1 className={styles.title}>{props.title}</h1>
        {props.subtitle && <p className={styles.subtitle}>{props.subtitle}</p>}
      </div>
      {(props.meta || props.actions) && (
        <div className={styles.aside}>
          {props.meta && <div className={styles.meta}>{props.meta}</div>}
          {props.actions && <div className={styles.actions}>{props.actions}</div>}
        </div>
      )}
    </header>
  );
}
