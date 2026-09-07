import * as React from 'react';
import { FiSearch } from 'react-icons/fi';
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
        <FiSearch />
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
