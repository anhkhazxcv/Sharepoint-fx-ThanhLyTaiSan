import * as React from 'react';
import styles from './PaginationBar.module.scss';

export interface IPaginationBarProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (pageSize: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function PaginationBar(props: IPaginationBarProps): React.ReactElement {
  const totalPages: number = Math.max(Math.ceil(props.totalItems / props.pageSize), 1);
  const rangeStart: number = props.totalItems ? (props.currentPage - 1) * props.pageSize + 1 : 0;
  const rangeEnd: number = Math.min(props.currentPage * props.pageSize, props.totalItems);

  return (
    <div className={styles.paginationBar}>
      <div className={styles.summary}>
        Hiển thị {rangeStart}-{rangeEnd} / {props.totalItems}
      </div>

      <div className={styles.controls}>
        <label className={styles.pageSizeControl}>
          <span>Mỗi trang</span>
          <select
            value={props.pageSize}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
              props.onPageSizeChange(Number(event.target.value));
            }}
            className={styles.pageSizeSelect}
          >
            {props.pageSizeOptions.map((option: number) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.pageNavigation}>
          <button type="button" className={styles.pageButton} onClick={props.onPreviousPage} disabled={props.currentPage === 1}>
            Trước
          </button>
          <span className={styles.pageIndicator}>
            Trang {props.currentPage}/{totalPages}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={props.onNextPage}
            disabled={props.currentPage === totalPages}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
