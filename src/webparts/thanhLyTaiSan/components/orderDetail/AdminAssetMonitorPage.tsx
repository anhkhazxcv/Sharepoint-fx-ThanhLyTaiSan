import * as React from 'react';
import { Dropdown, type IDropdownOption } from '@fluentui/react';
import type { SPHttpClient } from '@microsoft/sp-http';
import type { IOrderDetail } from './types';
import type { IUserTransactionRecord } from '../services/orderTransactionService';
import type { IAssetItem } from '../types';
import type { ICartLineRecord } from '../services/cartService';
import { buildAssetMonitorData, getAllCartLineRecords } from '../services/assetMonitorService';
import {
  ASSET_ACTIVITY_FILTER_OPTIONS,
  ASSET_PRICE_TYPE_OPTIONS,
  ASSET_STOCK_STATUS_FILTER_OPTIONS,
  DEFAULT_ASSET_MONITOR_FILTERS,
  DEFAULT_ASSET_MONITOR_SORT,
  computeAssetMonitorKpi,
  filterAssetMonitorRecords,
  getAssetStockStatusLabel,
  getAssetStockStatusVariant,
  getUniqueAssetFieldValues,
  sortAssetMonitorRecords,
  toDropdownOptions,
  toggleDropdownMultiSelectValue,
  type IAssetMonitorFilters,
  type IAssetMonitorRecord,
  type IAssetMonitorSortState,
  type IAssetOrderLink
} from '../services/assetMonitorUtils';
import {
  AppButton,
  DataTable,
  EmptyState,
  PageHeader,
  PaginationBar,
  StatCard,
  StatusBadge,
  type IDataTableColumn,
  type IDataTableSortState
} from '../common';
import { formatCurrency } from './utils/format';
import { AdminAssetDetailPanel } from './AdminAssetDetailPanel';
import type { IAssetImportResult } from '../services/assetImportService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import styles from './AdminAssetMonitorPage.module.scss';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50];
const AdminAssetImportDialog = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'admin-asset-import-dialog' */ './AdminAssetImportDialog');
  return { default: module.AdminAssetImportDialog };
});

export interface IAdminAssetMonitorPageProps {
  spHttpClient: SPHttpClient;
  siteUrl: string;
  assets: IAssetItem[];
  transactions: IUserTransactionRecord[];
  onOpenOrder: (order: IOrderDetail) => void;
  onAssetsRefresh?: () => Promise<unknown>;
}

function buildRelatedOrders(
  productCode: string,
  transactions: IUserTransactionRecord[]
): IAssetOrderLink[] {
  const relatedOrders: IAssetOrderLink[] = [];

  transactions.forEach((transaction: IUserTransactionRecord): void => {
    transaction.items.forEach((item): void => {
      if (item.productCode !== productCode) {
        return;
      }

      relatedOrders.push({
        orderId: transaction.orderId,
        orderCode: transaction.orderCode,
        buyerName: transaction.buyerName,
        quantity: item.quantity,
        paymentStatus: transaction.paymentStatus,
        handoverStatus: transaction.status,
        purchaseDate: transaction.purchaseDate
      });
    });
  });

  return relatedOrders.sort((left: IAssetOrderLink, right: IAssetOrderLink): number => {
    return right.purchaseDate.localeCompare(left.purchaseDate);
  });
}

function mapStringOptions(values: string[]): IDropdownOption[] {
  return toDropdownOptions(
    values.map((value: string) => ({ value, label: value })),
    true
  );
}

function renderMultiSelectTitle(
  selectedKeys: string[],
  options: Array<{ value: string; label: string }>
): React.ReactElement {
  if (!selectedKeys.length) {
    return <span>Tất cả</span>;
  }

  const selectedLabels: string[] = selectedKeys
    .map((key: string) => options.filter((option) => option.value === key)[0]?.label)
    .filter(Boolean) as string[];

  return (
    <span className={styles.multiSelectTitle}>
      <span className={styles.multiSelectCount}>{selectedKeys.length} đã chọn</span>
      <span className={styles.multiSelectSummary}>{selectedLabels.join(', ')}</span>
    </span>
  );
}

export function AdminAssetMonitorPage(props: IAdminAssetMonitorPageProps): React.ReactElement {
  const isDesktopLayout: boolean = useMediaQuery('(min-width: 901px)');
  const [cartLines, setCartLines] = React.useState<ICartLineRecord[]>([]);
  const [filters, setFilters] = React.useState<IAssetMonitorFilters>(DEFAULT_ASSET_MONITOR_FILTERS);
  const [sortState, setSortState] = React.useState<IAssetMonitorSortState>(DEFAULT_ASSET_MONITOR_SORT);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>('');
  const [selectedProductCode, setSelectedProductCode] = React.useState<string | undefined>(undefined);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState<boolean>(false);

  const transactionSignature: string = React.useMemo(() => {
    return props.transactions
      .map((transaction) => transaction.orderId + ':' + String(transaction.items.length))
      .join('|');
  }, [props.transactions]);

  const reloadCartLines = React.useCallback((): Promise<void> => {
    setIsLoading(true);
    setLoadError('');

    return getAllCartLineRecords(props.siteUrl, props.spHttpClient)
      .then((lines: ICartLineRecord[]) => {
        setCartLines(lines);
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải dữ liệu giám sát tài sản', error);
        setLoadError('Không tải được dữ liệu giám sát tài sản từ SharePoint.');
      })
      .then(
        () => {
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        }
      );
  }, [props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    reloadCartLines().catch(() => {
      // handled in reloadCartLines
    });
  }, [reloadCartLines]);

  const records: IAssetMonitorRecord[] = React.useMemo(() => {
    return buildAssetMonitorData(props.assets, props.transactions, cartLines).records;
  }, [props.assets, props.transactions, cartLines, transactionSignature]);

  const filteredRecords: IAssetMonitorRecord[] = React.useMemo(() => {
    return sortAssetMonitorRecords(filterAssetMonitorRecords(records, filters), sortState);
  }, [filters, records, sortState]);

  const kpi = React.useMemo(() => computeAssetMonitorKpi(filteredRecords), [filteredRecords]);
  const totalPages: number = Math.max(Math.ceil(filteredRecords.length / pageSize), 1);
  const paginatedRecords: IAssetMonitorRecord[] = React.useMemo(() => {
    const startIndex: number = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredRecords, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortState, pageSize]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedRecord: IAssetMonitorRecord | undefined = React.useMemo(() => {
    if (!selectedProductCode) {
      return undefined;
    }

    return records.filter((record: IAssetMonitorRecord) => record.asset.assetCode === selectedProductCode)[0];
  }, [records, selectedProductCode]);

  const relatedOrders: IAssetOrderLink[] = React.useMemo(() => {
    if (!selectedProductCode) {
      return [];
    }

    return buildRelatedOrders(selectedProductCode, props.transactions);
  }, [props.transactions, selectedProductCode]);

  const siteOptions: string[] = React.useMemo(() => getUniqueAssetFieldValues(records, 'site'), [records]);
  const legalEntityOptions: string[] = React.useMemo(() => getUniqueAssetFieldValues(records, 'legalEntity'), [records]);
  const conditionOptions: string[] = React.useMemo(() => getUniqueAssetFieldValues(records, 'condition'), [records]);
  const addressOptions: string[] = React.useMemo(() => getUniqueAssetFieldValues(records, 'address'), [records]);

  const tableColumns: IDataTableColumn<IAssetMonitorRecord>[] = React.useMemo(
    () => [
      {
        key: 'image',
        header: 'Ảnh',
        headerClassName: styles.thumbCell,
        cellClassName: styles.thumbCell,
        render: (record: IAssetMonitorRecord) =>
          record.asset.imageUrl ? (
            <img src={record.asset.imageUrl} alt="" className={styles.thumb} />
          ) : (
            <span className={styles.thumbFallback}>N/A</span>
          )
      },
      {
        key: 'assetCode',
        header: 'Mã',
        sortable: true,
        cellClassName: styles.codeCell,
        render: (record: IAssetMonitorRecord) => record.asset.assetCode
      },
      {
        key: 'assetName',
        header: 'Tên tài sản',
        sortable: true,
        render: (record: IAssetMonitorRecord) => (
          <button
            type="button"
            className={styles.nameButton}
            onClick={(): void => setSelectedProductCode(record.asset.assetCode)}
          >
            {record.asset.assetName}
          </button>
        )
      },
      {
        key: 'quantity',
        header: 'Tồn',
        sortable: true,
        align: 'right',
        cellClassName: styles.numCell,
        render: (record: IAssetMonitorRecord) => record.asset.quantity
      },
      {
        key: 'stockStatus',
        header: 'Trạng thái',
        sortable: true,
        render: (record: IAssetMonitorRecord) => (
          <StatusBadge
            label={getAssetStockStatusLabel(record.asset.quantity)}
            variant={getAssetStockStatusVariant(record.asset.quantity)}
          />
        )
      },
      {
        key: 'visible',
        header: 'Hiển thị',
        sortable: true,
        render: (record: IAssetMonitorRecord) => (
          <StatusBadge
            label={record.asset.isVisibleToBuyer ? 'Có' : 'Không'}
            variant={record.asset.isVisibleToBuyer ? 'success' : 'neutral'}
          />
        )
      },
      {
        key: 'price',
        header: 'Giá',
        sortable: true,
        align: 'right',
        cellClassName: styles.numCell,
        render: (record: IAssetMonitorRecord) =>
          record.asset.price > 0 ? formatCurrency(record.asset.price) : 'Miễn phí'
      },
      {
        key: 'legalEntity',
        header: 'Pháp nhân',
        sortable: true,
        render: (record: IAssetMonitorRecord) => record.asset.legalEntity || '-'
      },
      {
        key: 'site',
        header: 'Site',
        sortable: true,
        render: (record: IAssetMonitorRecord) => record.asset.site || '-'
      },
      {
        key: 'condition',
        header: 'Tình trạng',
        sortable: true,
        render: (record: IAssetMonitorRecord) => record.asset.condition || '-'
      },
      {
        key: 'soldQty',
        header: 'Đã đăng ký',
        sortable: true,
        align: 'right',
        cellClassName: styles.numCell,
        render: (record: IAssetMonitorRecord) => record.soldQty
      },
      {
        key: 'cartQty',
        header: 'Trong giỏ',
        sortable: true,
        align: 'right',
        cellClassName: styles.numCell,
        render: (record: IAssetMonitorRecord) => record.cartQty
      },
      {
        key: 'unit',
        header: 'Đơn vị',
        sortable: true,
        render: (record: IAssetMonitorRecord) => record.asset.unitOfMeasure || '-'
      }
    ],
    []
  );

  function updateFilter<K extends keyof IAssetMonitorFilters>(key: K, value: IAssetMonitorFilters[K]): void {
    setFilters((prevState: IAssetMonitorFilters) => ({
      ...prevState,
      [key]: value
    }));
  }

  function handleTableSortChange(nextSort: IDataTableSortState): void {
    setSortState({
      columnKey: nextSort.columnKey as IAssetMonitorSortState['columnKey'],
      direction: nextSort.direction
    });
  }

  function handleImportCompleted(_result: IAssetImportResult): void {
    const refreshTasks: Promise<unknown>[] = [reloadCartLines()];

    if (props.onAssetsRefresh) {
      refreshTasks.push(props.onAssetsRefresh());
    }

    Promise.all(refreshTasks).catch(() => {
      // errors handled in individual tasks
    });
  }

  function renderImportDialog(): React.ReactNode {
    if (!isImportDialogOpen) {
      return <></>;
    }

    return (
      <React.Suspense fallback={<></>}>
        <AdminAssetImportDialog
          isOpen={isImportDialogOpen}
          siteUrl={props.siteUrl}
          spHttpClient={props.spHttpClient}
          onClose={(): void => setIsImportDialogOpen(false)}
          onCompleted={handleImportCompleted}
        />
      </React.Suspense>
    );
  }

  const importButton: React.ReactElement = (
    <AppButton variant="secondary" onClick={(): void => setIsImportDialogOpen(true)}>
      Import sản phẩm
    </AppButton>
  );

  if (isLoading) {
    return <div className={styles.loadingState}>Đang tải dữ liệu giám sát tài sản...</div>;
  }

  if (loadError) {
    return <div className={styles.errorState}>{loadError}</div>;
  }

  if (!props.assets.length) {
    return (
      <section className={styles.page}>
        <PageHeader title="Giám sát tài sản" subtitle="Import hoặc đối soát tài sản từ SharePoint." actions={importButton} />
        <EmptyState
          title="Chưa có tài sản nào"
          description="Danh sách tài sản sẽ hiển thị khi SharePoint có dữ liệu trong lstSanPham."
        />
        {renderImportDialog()}
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title="Giám sát tài sản"
        subtitle="Đối soát tồn kho, đơn đã đăng ký mua và hàng đang trong giỏ — chỉ xem, không chỉnh sửa."
        meta={<span className={styles.summaryChip}>{filteredRecords.length} mã tài sản</span>}
        actions={importButton}
      />

      <div className={styles.kpiGrid}>
        <StatCard label="Tổng mã tài sản" value={kpi.totalCount} />
        <StatCard label="Còn hàng" value={kpi.availableCount} />
        <StatCard label="Sắp hết" value={kpi.lowStockCount} />
        <StatCard label="Hết hàng" value={kpi.soldOutCount} />
        <StatCard label="Giá trị tồn còn lại" value={formatCurrency(kpi.remainingInventoryValue)} />
      </div>

      <div className={styles.filterPanel}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Tìm kiếm</span>
          <input
            type="search"
            className={styles.input}
            placeholder="Mã, tên, barcode"
            value={filters.search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateFilter('search', event.target.value)}
          />
        </label>

        <Dropdown
          className={styles.filterDropdown}
          label="Trạng thái tồn"
          placeholder="Tất cả"
          multiSelect
          options={toDropdownOptions(ASSET_STOCK_STATUS_FILTER_OPTIONS)}
          selectedKeys={filters.stockStatusFilters}
          onRenderTitle={(): React.ReactElement =>
            renderMultiSelectTitle(filters.stockStatusFilters, ASSET_STOCK_STATUS_FILTER_OPTIONS)
          }
          onChange={(_event, option): void => {
            if (!option) {
              return;
            }

            updateFilter(
              'stockStatusFilters',
              toggleDropdownMultiSelectValue(filters.stockStatusFilters, String(option.key), !!option.selected)
            );
          }}
        />

        <Dropdown
          className={styles.filterDropdown}
          label="Site"
          placeholder="Tất cả"
          options={mapStringOptions(siteOptions)}
          selectedKey={filters.site || ''}
          onChange={(_event, option): void => updateFilter('site', String(option?.key ?? ''))}
        />

        <Dropdown
          className={styles.filterDropdown}
          label="Pháp nhân"
          placeholder="Tất cả"
          options={mapStringOptions(legalEntityOptions)}
          selectedKey={filters.legalEntity || ''}
          onChange={(_event, option): void => updateFilter('legalEntity', String(option?.key ?? ''))}
        />

        <Dropdown
          className={styles.filterDropdown}
          label="Tình trạng"
          placeholder="Tất cả"
          options={mapStringOptions(conditionOptions)}
          selectedKey={filters.condition || ''}
          onChange={(_event, option): void => updateFilter('condition', String(option?.key ?? ''))}
        />
      </div>

      <div className={styles.advancedFilters}>
        <Dropdown
          className={styles.filterDropdown}
          label="Địa chỉ"
          placeholder="Tất cả"
          options={mapStringOptions(addressOptions)}
          selectedKey={filters.address || ''}
          onChange={(_event, option): void => updateFilter('address', String(option?.key ?? ''))}
        />

        <Dropdown
          className={styles.filterDropdown}
          label="Giá"
          placeholder="Tất cả"
          options={toDropdownOptions(ASSET_PRICE_TYPE_OPTIONS, true)}
          selectedKey={filters.priceType || ''}
          onChange={(_event, option): void =>
            updateFilter('priceType', String(option?.key ?? '') as IAssetMonitorFilters['priceType'])
          }
        />

        <Dropdown
          className={styles.filterDropdown}
          label="Hoạt động"
          placeholder="Tất cả"
          multiSelect
          options={toDropdownOptions(ASSET_ACTIVITY_FILTER_OPTIONS)}
          selectedKeys={filters.activityFilters}
          onRenderTitle={(): React.ReactElement =>
            renderMultiSelectTitle(filters.activityFilters, ASSET_ACTIVITY_FILTER_OPTIONS)
          }
          onChange={(_event, option): void => {
            if (!option) {
              return;
            }

            updateFilter(
              'activityFilters',
              toggleDropdownMultiSelectValue(filters.activityFilters, String(option.key), !!option.selected)
            );
          }}
        />
      </div>

      {!filteredRecords.length ? (
        <EmptyState title="Không tìm thấy tài sản phù hợp" description="Thử đổi bộ lọc hoặc xóa điều kiện tìm kiếm." />
      ) : (
        <>
          {isDesktopLayout ? (
            <DataTable
              items={paginatedRecords}
              columns={tableColumns}
              getRowKey={(record: IAssetMonitorRecord) => record.asset.assetCode}
              sort={sortState}
              onSortChange={handleTableSortChange}
              tableClassName={styles.assetMonitorTable}
              ariaLabel="Bảng giám sát tài sản"
            />
          ) : (
            <div className={styles.mobileList}>
              {paginatedRecords.map((record: IAssetMonitorRecord) => (
                <article key={record.asset.assetCode} className={styles.mobileCard}>
                  <div className={styles.mobileHeader}>
                    <strong>{record.asset.assetCode}</strong>
                    <button type="button" className={styles.nameButton} onClick={(): void => setSelectedProductCode(record.asset.assetCode)}>
                      Chi tiết
                    </button>
                  </div>
                  <div className={styles.mobileRow}>
                    <span>Tên tài sản</span>
                    <strong>{record.asset.assetName}</strong>
                  </div>
                  <div className={styles.mobileRow}>
                    <span>Tồn</span>
                    <strong>{record.asset.quantity}</strong>
                  </div>
                  <div className={styles.mobileRow}>
                    <span>Trạng thái</span>
                    <StatusBadge
                      label={getAssetStockStatusLabel(record.asset.quantity)}
                      variant={getAssetStockStatusVariant(record.asset.quantity)}
                    />
                  </div>
                  <div className={styles.mobileRow}>
                    <span>Hiển thị cho người mua</span>
                    <StatusBadge
                      label={record.asset.isVisibleToBuyer ? 'Có' : 'Không'}
                      variant={record.asset.isVisibleToBuyer ? 'success' : 'neutral'}
                    />
                  </div>
                  <div className={styles.mobileRow}>
                    <span>Đã đăng ký / Trong giỏ</span>
                    <strong>
                      {record.soldQty} / {record.cartQty}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}

          <PaginationBar
            totalItems={filteredRecords.length}
            currentPage={currentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(nextPageSize: number) => {
              setPageSize(nextPageSize);
              setCurrentPage(1);
            }}
            onPreviousPage={(): void => {
              if (currentPage > 1) {
                setCurrentPage(currentPage - 1);
              }
            }}
            onNextPage={(): void => {
              if (currentPage < totalPages) {
                setCurrentPage(currentPage + 1);
              }
            }}
          />
        </>
      )}

      {selectedRecord && (
        <>
          <button type="button" className={styles.backdrop} aria-label="Đóng chi tiết" onClick={(): void => setSelectedProductCode(undefined)} />
          <AdminAssetDetailPanel
            record={selectedRecord}
            relatedOrders={relatedOrders}
            onClose={(): void => setSelectedProductCode(undefined)}
            onOpenOrder={props.onOpenOrder}
          />
        </>
      )}

      {renderImportDialog()}
    </section>
  );
}
