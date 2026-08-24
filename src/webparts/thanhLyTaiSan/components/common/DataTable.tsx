import * as React from 'react';
import styles from './DataTable.module.scss';

export type TDataTableSortDirection = 'asc' | 'desc';
export type TDataTableColumnAlign = 'left' | 'right' | 'center';

export interface IDataTableSortState {
  columnKey: string;
  direction: TDataTableSortDirection;
}

export interface IDataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: TDataTableColumnAlign;
  headerClassName?: string;
  cellClassName?: string;
  renderHeader?: () => React.ReactNode;
  render: (item: T) => React.ReactNode;
}

export interface IDataTableProps<T> {
  items: T[];
  columns: IDataTableColumn<T>[];
  getRowKey: (item: T) => string;
  sort?: IDataTableSortState;
  onSortChange?: (sort: IDataTableSortState) => void;
  ariaLabel?: string;
  tableClassName?: string;
  wrapClassName?: string;
  getRowClassName?: (item: T) => string | undefined;
}

function getAriaSortValue(
  columnKey: string,
  sort: IDataTableSortState | undefined
): 'none' | 'ascending' | 'descending' {
  if (!sort || sort.columnKey !== columnKey) {
    return 'none';
  }

  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

function getSortIndicator(sort: IDataTableSortState | undefined, columnKey: string): string {
  if (!sort || sort.columnKey !== columnKey) {
    return '↕';
  }

  return sort.direction === 'asc' ? '↑' : '↓';
}

function getAlignClassName(align: TDataTableColumnAlign | undefined): string | undefined {
  if (align === 'right') {
    return styles.alignRight;
  }

  if (align === 'center') {
    return styles.alignCenter;
  }

  return undefined;
}

export function DataTable<T>(props: IDataTableProps<T>): React.ReactElement {
  const handleHeaderClick = (column: IDataTableColumn<T>): void => {
    if (!column.sortable || !props.onSortChange) {
      return;
    }

    const currentSort: IDataTableSortState | undefined = props.sort;

    if (!currentSort || currentSort.columnKey !== column.key) {
      props.onSortChange({
        columnKey: column.key,
        direction: 'asc'
      });
      return;
    }

    props.onSortChange({
      columnKey: column.key,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  return (
    <div className={`${styles.tableWrap} ${props.wrapClassName || ''}`.trim()}>
      <table
        className={`${styles.table} ${props.tableClassName || ''}`.trim()}
        aria-label={props.ariaLabel}
      >
        <thead>
          <tr>
            {props.columns.map((column: IDataTableColumn<T>) => {
              const alignClassName: string | undefined = getAlignClassName(column.align);
              const isActiveSort: boolean = !!props.sort && props.sort.columnKey === column.key;
              const headerClassName: string = [
                column.headerClassName,
                alignClassName,
                column.sortable && props.onSortChange ? styles.sortableTh : '',
                isActiveSort ? styles.sortActiveTh : ''
              ]
                .filter(Boolean)
                .join(' ');

              if (column.sortable && props.onSortChange) {
                return (
                  <th key={column.key} className={headerClassName} aria-sort={getAriaSortValue(column.key, props.sort)}>
                    <button
                      type="button"
                      className={styles.sortableHeader}
                      onClick={(): void => handleHeaderClick(column)}
                    >
                      <span className={styles.headerText}>{column.header}</span>
                      <span
                        className={`${styles.sortIndicator} ${isActiveSort ? styles.sortIndicatorActive : styles.sortIndicatorInactive}`}
                        aria-hidden="true"
                      >
                        {getSortIndicator(props.sort, column.key)}
                      </span>
                    </button>
                  </th>
                );
              }

              return (
                <th key={column.key} className={headerClassName}>
                  {column.renderHeader ? column.renderHeader() : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {props.items.map((item: T) => {
            const rowClassName: string | undefined = props.getRowClassName ? props.getRowClassName(item) : undefined;

            return (
              <tr key={props.getRowKey(item)} className={rowClassName}>
                {props.columns.map((column: IDataTableColumn<T>) => {
                  const cellClassName: string = [column.cellClassName, getAlignClassName(column.align)]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <td key={column.key} className={cellClassName || undefined}>
                      {column.render(item)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
