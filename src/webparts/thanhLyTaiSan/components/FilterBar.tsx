import * as React from 'react';
import { PurchaseLimitBadge } from './PurchaseLimitBadge';
import { SearchBox } from './SearchBox';
import type { IAssetFilters } from './types';
import styles from './FilterBar.module.scss';

export interface IFilterBarProps {
  filters: IAssetFilters;
  conditions: string[];
  sites: string[];
  addresses: string[];
  searchValue: string;
  purchasedCount: number;
  maxLimit: number;
  resultCount: number;
  totalCount: number;
  sortValue: string;
  activeFilterChips: string[];
  onFilterChange: (key: keyof IAssetFilters, value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
}

interface ISelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SelectField(props: ISelectFieldProps): React.ReactElement {
  const { id, label, value, options, onChange } = props;

  return (
    <label className={styles.filterField} htmlFor={id}>
      <span className={styles.filterLabel}>{label}</span>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        <option value="">Tất cả</option>
        {options.map((option: string) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar(props: IFilterBarProps): React.ReactElement {
  const {
    filters,
    conditions,
    sites,
    addresses,
    searchValue,
    purchasedCount,
    maxLimit,
    resultCount,
    totalCount,
    sortValue,
    activeFilterChips,
    onFilterChange,
    onSearchChange,
    onSortChange,
    onClearFilters
  } = props;

  return (
    <section className={styles.filterShell}>
      <div className={styles.topBar}>
        <div className={styles.resultSummary}>
          <span className={styles.resultLabel}>Bộ lọc & tìm kiếm</span>
          <strong className={styles.resultValue}>
            {resultCount}/{totalCount} tài sản phù hợp
          </strong>
        </div>

        <div className={styles.utilityGroup}>
          <PurchaseLimitBadge purchasedCount={purchasedCount} maxLimit={maxLimit} />

          <label className={styles.sortField} htmlFor="sort-assets">
            <span className={styles.filterLabel}>Sắp xếp</span>
            <select
              id="sort-assets"
              className={styles.select}
              value={sortValue}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onSortChange(event.target.value)}
            >
              <option value="latest">Mới nhất</option>
              <option value="priceAsc">Giá thấp đến cao</option>
              <option value="priceDesc">Giá cao đến thấp</option>
              <option value="nameAsc">Tên A-Z</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.searchRow}>
        <SearchBox
          value={searchValue}
          placeholder="Tìm theo tên tài sản, mã tài sản, barcode..."
          ariaLabel="Tìm kiếm tài sản"
          onChange={onSearchChange}
        />
      </div>

      <div className={styles.filterGrid}>
        <SelectField
          id="filter-condition"
          label="Tình trạng"
          value={filters.condition}
          options={conditions}
          onChange={(value: string) => onFilterChange('condition', value)}
        />
        <SelectField
          id="filter-site"
          label="Địa điểm"
          value={filters.site}
          options={sites}
          onChange={(value: string) => onFilterChange('site', value)}
        />
        <SelectField
          id="filter-address"
          label="Địa chỉ"
          value={filters.address}
          options={addresses}
          onChange={(value: string) => onFilterChange('address', value)}
        />
        <div className={styles.actionArea}>
          <button type="button" className={styles.clearButton} onClick={onClearFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {!!activeFilterChips.length && (
        <div className={styles.chipRow}>
          {activeFilterChips.map((chip: string) => (
            <span key={chip} className={styles.filterChip}>
              {chip}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
