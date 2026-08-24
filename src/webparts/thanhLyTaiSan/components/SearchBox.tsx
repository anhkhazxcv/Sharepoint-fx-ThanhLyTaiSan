import * as React from 'react';
import styles from './SearchBox.module.scss';

export interface ISearchBoxProps {
  value: string;
  placeholder: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
}

export function SearchBox(props: ISearchBoxProps): React.ReactElement {
  const { value, placeholder, ariaLabel, onChange } = props;

  return (
    <label className={styles.searchBox}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M10.5 4.5a6 6 0 104.243 10.243l4.257 4.257 1.414-1.414-4.257-4.257A6 6 0 0010.5 4.5zm0 2a4 4 0 110 8 4 4 0 010-8z"
            fill="currentColor"
          />
        </svg>
      </span>
      <input
        className={styles.input}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </label>
  );
}
