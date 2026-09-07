import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetGrid } from './AssetGrid';
import { FilterBar } from './FilterBar';
import { NoticeBanner, PaginationBar, StatCard } from './common';
import type { IAssetFilters, IAssetItem, ICartItem } from './types';
import { upsertCartItem } from './services/cartService';
import { LoadingOverlay } from './LoadingOverlay';
import { useToast } from './ToastProvider';
import { scrollToElement } from './utils/scrollToElement';
import styles from './AssetLiquidationPage.module.scss';

export interface IAssetLiquidationPageProps {
  userDisplayName?: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  purchasedCount: number;
  maxOrder?: number;
  isStopSellingEnabled: boolean;
  isUserBlacklisted?: boolean;
  assets: IAssetItem[];
  isLoadingAssets: boolean;
  assetLoadError: string;
  cartItems: ICartItem[];
  onRefreshCart: () => Promise<ICartItem[]>;
}

type TSortOption = 'latest' | 'priceAsc' | 'priceDesc' | 'nameAsc';

const defaultFilters: IAssetFilters = {
  condition: '',
  site: '',
  address: ''
};

const PAGE_SIZE_OPTIONS: number[] = [12, 24, 48];

function normalizeKeyword(value: string): string {
  return value
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[ÌÍỊỈĨ]/g, 'I')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/[ỲÝỴỶỸ]/g, 'Y')
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D')
    .trim()
    .toLowerCase();
}

function getUniqueValues(items: IAssetItem[], key: keyof IAssetItem): string[] {
  const valueSet: Set<string> = new Set<string>();

  items.forEach((item: IAssetItem): void => {
    const value: string = String(item[key] || '').trim();

    if (value) {
      valueSet.add(value);
    }
  });

  const values: string[] = [];
  valueSet.forEach((value: string) => {
    values.push(value);
  });

  return values.sort((left: string, right: string) => left.localeCompare(right, 'vi'));
}

interface ISearchableAsset {
  asset: IAssetItem;
  normalizedCode: string;
  normalizedName: string;
  normalizedBarcode: string;
  normalizedAddress: string;
}

function getSortLabel(sortValue: TSortOption): string {
  switch (sortValue) {
    case 'priceAsc':
      return 'Giá thấp đến cao';
    case 'priceDesc':
      return 'Giá cao đến thấp';
    case 'nameAsc':
      return 'Tên A-Z';
    case 'latest':
    default:
      return 'Mới nhất';
  }
}

function getActiveFilterChips(filters: IAssetFilters, searchValue: string, sortValue: TSortOption): string[] {
  const chips: string[] = [];

  if (filters.condition) {
    chips.push('Tình trạng: ' + filters.condition);
  }

  if (filters.site) {
    chips.push('Địa điểm: ' + filters.site);
  }

  if (filters.address) {
    chips.push('Địa chỉ: ' + filters.address);
  }

  if (searchValue.trim()) {
    chips.push('Từ khóa: ' + searchValue.trim());
  }

  if (sortValue !== 'latest') {
    chips.push('Sắp xếp: ' + getSortLabel(sortValue));
  }

  return chips;
}

export function AssetLiquidationPage(props: IAssetLiquidationPageProps): React.ReactElement {
  const displayName: string = props.userDisplayName || 'Người dùng nội bộ';
  const { showToast } = useToast();
  const assets: IAssetItem[] = props.assets;
  const isLoadingAssets: boolean = props.isLoadingAssets;
  const assetLoadError: string = props.assetLoadError;

  const [filters, setFilters] = React.useState<IAssetFilters>(defaultFilters);
  const [searchInput, setSearchInput] = React.useState<string>('');
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [sortValue, setSortValue] = React.useState<TSortOption>('latest');
  const [quantityInputs, setQuantityInputs] = React.useState<Record<string, string>>({});
  const [quantityErrors, setQuantityErrors] = React.useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [submittingAssetIds, setSubmittingAssetIds] = React.useState<Record<string, boolean>>({});
  const listSectionRef = React.useRef<HTMLHeadingElement>(null);
  const cartItems: ICartItem[] = props.cartItems;

  React.useEffect(() => {
    const timerId: number = window.setTimeout((): void => {
      setSearchValue(searchInput);
    }, 250);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchInput]);

  const conditions: string[] = React.useMemo(() => getUniqueValues(assets, 'condition'), [assets]);
  const sites: string[] = React.useMemo(() => getUniqueValues(assets, 'site'), [assets]);
  const addresses: string[] = React.useMemo(() => getUniqueValues(assets, 'address'), [assets]);

  const purchaseLimit: number = props.maxOrder ?? 5;
  const remainingLimit: number = Math.max(purchaseLimit - props.purchasedCount, 0);
  const cartQuantity: number = React.useMemo(
    () => cartItems.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0),
    [cartItems]
  );
  const availableAssetCount: number = React.useMemo(
    () => assets.filter((asset: IAssetItem) => asset.isVisibleToBuyer && asset.quantity > 0).length,
    [assets]
  );

  const searchableAssets: ISearchableAsset[] = React.useMemo(() => {
    return assets.map((asset: IAssetItem): ISearchableAsset => ({
      asset,
      normalizedCode: normalizeKeyword(asset.assetCode),
      normalizedName: normalizeKeyword(asset.assetName),
      normalizedBarcode: normalizeKeyword(asset.barcode),
      normalizedAddress: normalizeKeyword(asset.address)
    }));
  }, [assets]);

  const visibleAssets: IAssetItem[] = React.useMemo(() => {
    const keyword: string = normalizeKeyword(searchValue);

    return searchableAssets
      .filter((entry: ISearchableAsset) => {
        const asset: IAssetItem = entry.asset;

        if (!asset.isVisibleToBuyer) {
          return false;
        }

        const matchesCondition: boolean = !filters.condition || asset.condition === filters.condition;
        const matchesSite: boolean = !filters.site || asset.site === filters.site;
        const matchesAddress: boolean = !filters.address || asset.address === filters.address;
        const matchesSearch: boolean =
          !keyword ||
          entry.normalizedCode.indexOf(keyword) >= 0 ||
          entry.normalizedName.indexOf(keyword) >= 0 ||
          entry.normalizedBarcode.indexOf(keyword) >= 0 ||
          entry.normalizedAddress.indexOf(keyword) >= 0;

        return matchesCondition && matchesSite && matchesAddress && matchesSearch;
      })
      .map((entry: ISearchableAsset) => entry.asset)
      .slice()
      .sort((left: IAssetItem, right: IAssetItem) => {
        const stockPriority: number = Number(right.quantity > 0) - Number(left.quantity > 0);

        if (stockPriority !== 0) {
          return stockPriority;
        }

        switch (sortValue) {
          case 'priceAsc':
            return left.price - right.price;
          case 'priceDesc':
            return right.price - left.price;
          case 'nameAsc':
            return left.assetName.localeCompare(right.assetName, 'vi');
          case 'latest':
          default:
            return right.id.localeCompare(left.id);
        }
      });
  }, [filters, searchableAssets, searchValue, sortValue]);

  const totalPages: number = Math.max(Math.ceil(visibleAssets.length / pageSize), 1);
  const paginatedAssets: IAssetItem[] = React.useMemo(() => {
    const startIndex: number = (currentPage - 1) * pageSize;
    return visibleAssets.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, visibleAssets]);

  const activeFilterChips: string[] = React.useMemo(
    () => getActiveFilterChips(filters, searchValue, sortValue),
    [filters, searchValue, sortValue]
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchValue, sortValue]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function scrollToAssetList(): void {
    window.requestAnimationFrame((): void => {
      scrollToElement(listSectionRef.current ?? undefined);
    });
  }

  function handlePageSizeChange(nextPageSize: number): void {
    setPageSize(nextPageSize);
    setCurrentPage(1);
    scrollToAssetList();
  }

  function goToPreviousPage(): void {
    if (currentPage <= 1) {
      return;
    }

    setCurrentPage(currentPage - 1);
    scrollToAssetList();
  }

  function goToNextPage(): void {
    if (currentPage >= totalPages) {
      return;
    }

    setCurrentPage(currentPage + 1);
    scrollToAssetList();
  }

  const updateQuantityState = React.useCallback(
    (asset: IAssetItem, rawValue: string) => {
      let nextValue: string = rawValue.replace(/[^\d]/g, '');
      let errorMessage: string = '';
      const currentCartItem: ICartItem | undefined = cartItems.filter((item: ICartItem) => item.productCode === asset.assetCode)[0];
      const quantityOutsideCurrentItem: number = cartQuantity - (currentCartItem ? currentCartItem.quantity : 0);
      const maxAllowedForAsset: number = Math.max(remainingLimit - quantityOutsideCurrentItem, 0);

      if (nextValue === '') {
        setQuantityInputs((prevState) => ({
          ...prevState,
          [asset.id]: ''
        }));
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]: ''
        }));
        return;
      }

      const parsedValue: number = Number(nextValue);

      if (parsedValue === 0) {
        errorMessage = 'Số lượng mua phải lớn hơn 0.';
      }

      if (parsedValue > asset.quantity) {
        nextValue = String(asset.quantity);
      }

      if (Number(nextValue) > maxAllowedForAsset) {
        nextValue = String(maxAllowedForAsset);
        errorMessage = 'Bạn đã đăng ký vượt quá giới hạn mua còn lại.';
      }

      if (Number(nextValue) <= 0) {
        errorMessage = 'Bạn đã đạt giới hạn mua tối đa.';
      }

      setQuantityInputs((prevState) => ({
        ...prevState,
        [asset.id]: nextValue
      }));
      setQuantityErrors((prevState) => ({
        ...prevState,
        [asset.id]: errorMessage
      }));
    },
    [cartItems, cartQuantity, remainingLimit]
  );

  const handleQuantityChange = React.useCallback(
    (assetId: string, rawValue: string) => {
      const targetAsset: IAssetItem | undefined = assets.filter((asset: IAssetItem) => asset.id === assetId)[0];

      if (!targetAsset) {
        return;
      }

      updateQuantityState(targetAsset, rawValue);
    },
    [assets, updateQuantityState]
  );

  const handleFilterChange = React.useCallback((key: keyof IAssetFilters, value: string) => {
    setFilters((prevState) => ({
      ...prevState,
      [key]: value
    }));
  }, []);

  const handleClearAllFilters = React.useCallback(() => {
    setFilters(defaultFilters);
    setSearchInput('');
    setSearchValue('');
    setSortValue('latest');
  }, []);

  const setAssetSubmittingState = React.useCallback((assetId: string, isSubmitting: boolean) => {
    setSubmittingAssetIds((prevState) => ({
      ...prevState,
      [assetId]: isSubmitting
    }));
  }, []);

  const handleAddToCart = React.useCallback(
    (asset: IAssetItem) => {
      if (props.isUserBlacklisted) {
        showToast('Tài khoản của bạn không được phép đăng ký mua hàng.', 'error');
        return;
      }

      if (props.isStopSellingEnabled) {
        showToast('Hệ thống đã tạm dừng đăng ký mua.', 'info');
        return;
      }

      const quantity: number = Number(quantityInputs[asset.id] || '0');
      const hasError: boolean = !!quantityErrors[asset.id];
      const currentCartItem: ICartItem | undefined = cartItems.filter((item: ICartItem) => item.productCode === asset.assetCode)[0];
      const quantityOutsideCurrentItem: number = cartQuantity - (currentCartItem ? currentCartItem.quantity : 0);
      const nextCartQuantity: number = quantityOutsideCurrentItem + quantity;

      if (!quantity || quantity <= 0 || quantity > asset.quantity || hasError) {
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]: 'Vui lòng nhập số lượng hợp lệ.'
        }));
        return;
      }

      if (nextCartQuantity > remainingLimit) {
        setQuantityErrors((prevState) => ({
          ...prevState,
          [asset.id]: 'Tổng số lượng đăng ký đã vượt quá giới hạn còn lại.'
        }));
        showToast('Bạn đã đăng ký vượt quá giới hạn mua. Vui lòng giảm số lượng.', 'error');
        return;
      }

      setAssetSubmittingState(asset.id, true);

      upsertCartItem({
        siteUrl: props.siteUrl,
        spHttpClient: props.spHttpClient,
        buyerName: displayName,
        buyerEmail: props.userEmail,
        productCode: asset.assetCode,
        quantity,
        unitPrice: asset.price
      })
        .then(() => props.onRefreshCart())
        .then(() => {
          showToast('Thêm vào giỏ hàng thành công!', 'success');
          setQuantityInputs((prevState) => ({
            ...prevState,
            [asset.id]: ''
          }));
          setQuantityErrors((prevState) => ({
            ...prevState,
            [asset.id]: ''
          }));
        })
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error('Không thể thêm vào giỏ hàng', error);
          showToast('Không thể thêm sản phẩm vào giỏ hàng.', 'error');
        })
        .then(
          () => {
            setAssetSubmittingState(asset.id, false);
          },
          () => {
            setAssetSubmittingState(asset.id, false);
          }
        );
    },
    [
      cartItems,
      cartQuantity,
      displayName,
      props.onRefreshCart,
      props.siteUrl,
      props.spHttpClient,
      props.userEmail,
      props.isStopSellingEnabled,
      props.isUserBlacklisted,
      quantityErrors,
      quantityInputs,
      remainingLimit,
      setAssetSubmittingState,
      showToast
    ]
  );

  return (
    <div className={styles.page}>
      <LoadingOverlay
        visible={Object.keys(submittingAssetIds).some((k: string) => !!submittingAssetIds[k])}
        message="Đang thêm vào giỏ hàng..."
      />
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>Nền tảng thanh lý tài sản nội bộ</div>
          <h1 className={styles.pageTitle}>Đăng ký mua tài sản dành cho cán bộ nhân viên</h1>
          <div className={styles.heroActions}>
            <span className={styles.primaryChip}>Đang mở bán: {availableAssetCount} tài sản</span>
            <span className={styles.secondaryChip}>Giỏ hàng hiện có: {cartQuantity} sản phẩm</span>
          </div>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <StatCard
          label="Tài sản đang hiển thị"
          value={visibleAssets.length}
          meta={`Tổng nguồn dữ liệu hiện có ${assets.length} tài sản`}
        />
        <StatCard
          label="Giới hạn còn lại"
          value={remainingLimit}
          meta={`Đã mua ${props.purchasedCount}/${purchaseLimit} tài sản`}
        />
        <StatCard label="Giỏ hàng hiện tại" value={cartQuantity} meta="Số lượng sản phẩm đang được chọn mua" />
      </section>

      <FilterBar
        filters={filters}
        conditions={conditions}
        sites={sites}
        addresses={addresses}
        searchValue={searchInput}
        purchasedCount={props.purchasedCount}
        maxLimit={purchaseLimit}
        resultCount={visibleAssets.length}
        totalCount={assets.length}
        sortValue={sortValue}
        activeFilterChips={activeFilterChips}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchInput}
        onSortChange={(value: string) => setSortValue(value as TSortOption)}
        onClearFilters={handleClearAllFilters}
      />

      <section className={styles.contentArea}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 ref={listSectionRef} className={styles.sectionTitle}>Danh sách tài sản</h2>
          </div>

          <div className={styles.sectionHeaderMeta}>
            <span className={styles.resultPill}>Sắp xếp: {getSortLabel(sortValue)}</span>
          </div>
        </div>

        {props.isUserBlacklisted && (
          <NoticeBanner variant="warning">Tài khoản của bạn không được phép đăng ký mua hàng.</NoticeBanner>
        )}

        {props.isStopSellingEnabled && (
          <NoticeBanner variant="warning">Hệ thống đã tạm dừng đăng ký mua. Vui lòng quay lại sau.</NoticeBanner>
        )}

        {isLoadingAssets ? (
          <div className={styles.skeletonGrid} aria-label="Đang tải danh sách tài sản">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item: number) => (
              <div key={item} className={styles.skeletonCard}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLineShort} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonPrice} />
                  <div className={styles.skeletonInfoGrid}>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : assetLoadError ? (
          <div className={styles.loadingState}>{assetLoadError}</div>
        ) : (
          <AssetGrid
            assets={paginatedAssets}
            quantityInputs={quantityInputs}
            errors={quantityErrors}
            remainingLimit={remainingLimit}
            submittingAssetIds={submittingAssetIds}
            isStopSellingEnabled={props.isStopSellingEnabled || !!props.isUserBlacklisted}
            onQuantityChange={handleQuantityChange}
            onAddToCart={handleAddToCart}
          />
        )}

        {!isLoadingAssets && !!visibleAssets.length && (
          <PaginationBar
            totalItems={visibleAssets.length}
            currentPage={currentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        )}
      </section>
    </div>
  );
}
