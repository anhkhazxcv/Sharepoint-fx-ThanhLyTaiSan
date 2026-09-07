import * as React from 'react';
import styles from './StatCard.module.scss';

export interface IStatCardProps {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
}

export function StatCard(props: IStatCardProps): React.ReactElement {
  return (
    <article className={styles.card}>
      <span className={styles.label}>{props.label}</span>
      <strong className={styles.value}>{props.value}</strong>
      {props.meta && <span className={styles.meta}>{props.meta}</span>}
    </article>
  );
}
