import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import type { IOrderDetail } from '../orderDetail/types';
import type { IAssetItem, ICartItem } from '../types';
import { getAssetsFromSharePoint } from '../services/assetCatalogService';
import { getAllBankInfoByLegalEntity, getBankInfoFromSharePoint, type IBankInfoRecord } from '../services/bankInfoService';
import { getMaxOrderConfig, getStartOrderConfig, getStopSellingConfig, isUserBlacklisted as checkUserBlacklisted, updateStartOrderConfig } from '../services/configService';
import { isUserAdmin } from '../services/roleService';
import { getCartItemsByUser, type ICartLineRecord } from '../services/cartService';
import { mapCartRecordsToItems } from '../mappers/cartItemMapper';
import {
  getAllTransactions,
  getTransactionsByUser,
  type IUserTransactionRecord
} from '../services/orderTransactionService';
import { useToast } from '../ToastProvider';
import { LST_SAN_PHAM } from '../constants/sharePointLists';
import { mapOrderDetailToTransactionRecord, mapTransactionRecordToOrderDetail } from './orderMappers';
import type { TAdminActionLoading } from './orderActions';

const MAX_SHAREPOINT_RETRIES: number = 5;

export type TWorkspaceTab = 'register' | 'cart' | 'orders' | 'admin' | 'assets';

export interface IWorkspaceDataProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
}

export function useWorkspaceData(props: IWorkspaceDataProps): {
  showToast: ReturnType<typeof useToast>['showToast'];
  activeTab: TWorkspaceTab;
  setActiveTab: React.Dispatch<React.SetStateAction<TWorkspaceTab>>;
  transactionRecords: IUserTransactionRecord[];
  setTransactionRecords: React.Dispatch<React.SetStateAction<IUserTransactionRecord[]>>;
  adminTransactionRecords: IUserTransactionRecord[];
  setAdminTransactionRecords: React.Dispatch<React.SetStateAction<IUserTransactionRecord[]>>;
  selectedOrderId: string | undefined;
  setSelectedOrderId: React.Dispatch<React.SetStateAction<string | undefined>>;
  assets: IAssetItem[];
  setAssets: React.Dispatch<React.SetStateAction<IAssetItem[]>>;
  isLoadingAssets: boolean;
  assetLoadError: string;
  refreshAssets: () => Promise<IAssetItem[]>;
  cartItems: ICartItem[];
  refreshCart: () => Promise<ICartItem[]>;
  bankInfoMap: Record<string, IBankInfoRecord>;
  hasAdminRole: boolean;
  maxOrder: number;
  isStopSellingEnabled: boolean;
  isUserBlacklisted: boolean;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  adminActionLoading: TAdminActionLoading;
  setAdminActionLoading: React.Dispatch<React.SetStateAction<TAdminActionLoading>>;
  isStartOrderEnabled: boolean;
  isCheckingStartOrder: boolean;
  isOpeningSession: boolean;
  isOpenSessionDialogVisible: boolean;
  startOrderError: string;
  startOrderSuccessMessage: string;
  setStartOrderSuccessMessage: React.Dispatch<React.SetStateAction<string>>;
  isAdminPreviewMode: boolean;
  setIsAdminPreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  canAccessWorkspace: boolean;
  orders: IOrderDetail[];
  adminOrders: IOrderDetail[];
  purchasedCount: number;
  getOrderById: (orderId: string) => IOrderDetail | undefined;
  updateTransactionStatusInState: (orderId: string, status: string) => void;
  updatePaymentStatusInState: (orderId: string, paymentStatus: string) => void;
  handlePurchaseSuccess: (orderDetail: IOrderDetail) => void;
  handleRequestOpenSession: () => void;
  handleCancelOpenSession: () => void;
  handleConfirmOpenSession: () => void;
  openOrderDetail: (order: IOrderDetail) => void;
  showOrderList: () => void;
  showAdminList: () => void;
  showAdminAssetList: () => void;
  selectedOrder: IOrderDetail | undefined;
  isAdminPreSessionMode: boolean;
  checkStartOrderStatus: () => Promise<void>;
} {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<TWorkspaceTab>('register');
  const [transactionRecords, setTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [adminTransactionRecords, setAdminTransactionRecords] = React.useState<IUserTransactionRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | undefined>(undefined);
  const [assets, setAssets] = React.useState<IAssetItem[]>([]);
  const [cartLineRecords, setCartLineRecords] = React.useState<ICartLineRecord[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = React.useState<boolean>(true);
  const [assetLoadError, setAssetLoadError] = React.useState<string>('');
  const [bankInfoMap, setBankInfoMap] = React.useState<Record<string, IBankInfoRecord>>({});
  const [hasAdminRole, setHasAdminRole] = React.useState<boolean>(false);
  const [maxOrder, setMaxOrder] = React.useState<number>(10);
  const [isStopSellingEnabled, setIsStopSellingEnabled] = React.useState<boolean>(false);
  const [isUserBlacklisted, setIsUserBlacklisted] = React.useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(false);
  const [adminActionLoading, setAdminActionLoading] = React.useState<TAdminActionLoading>(undefined);
  const [isStartOrderEnabled, setIsStartOrderEnabled] = React.useState<boolean>(false);
  const [isCheckingStartOrder, setIsCheckingStartOrder] = React.useState<boolean>(true);
  const [isOpeningSession, setIsOpeningSession] = React.useState<boolean>(false);
  const [isOpenSessionDialogVisible, setIsOpenSessionDialogVisible] = React.useState<boolean>(false);
  const [startOrderError, setStartOrderError] = React.useState<string>('');
  const [startOrderSuccessMessage, setStartOrderSuccessMessage] = React.useState<string>('');
  const [isAdminPreviewMode, setIsAdminPreviewMode] = React.useState<boolean>(false);

  const canAccessWorkspace: boolean = isStartOrderEnabled || (hasAdminRole && isAdminPreviewMode);

  const refreshAssets = React.useCallback((): Promise<IAssetItem[]> => {
    return getAssetsFromSharePoint({
      siteUrl: props.siteUrl,
      listTitle: LST_SAN_PHAM,
      spHttpClient: props.spHttpClient
    }).then((items: IAssetItem[]): IAssetItem[] => {
      setAssets(items);
      return items;
    });
  }, [props.siteUrl, props.spHttpClient]);

  const cartItems: ICartItem[] = React.useMemo((): ICartItem[] => {
    return mapCartRecordsToItems(assets, cartLineRecords);
  }, [assets, cartLineRecords]);

  const refreshCart = React.useCallback((): Promise<ICartItem[]> => {
    return getCartItemsByUser(props.siteUrl, props.spHttpClient, props.userEmail).then(
      (records: ICartLineRecord[]): ICartItem[] => {
        setCartLineRecords(records);
        return mapCartRecordsToItems(assets, records);
      }
    );
  }, [assets, props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    if (!canAccessWorkspace) {
      setAssets([]);
      setIsLoadingAssets(false);
      return;
    }

    let isMounted: boolean = true;
    let attemptCount: number = 0;

    setIsLoadingAssets(true);
    setAssetLoadError('');

    function loadAssets(): void {
      attemptCount += 1;

      refreshAssets()
        .then((): void => {
          if (isMounted) {
            setIsLoadingAssets(false);
          }
        })
        .catch((error: Error): void => {
          if (!isMounted) {
            return;
          }

          // eslint-disable-next-line no-console
          console.error('OrderWorkspace fetch assets error, attempt ' + String(attemptCount) + ':', error);

          if (attemptCount < MAX_SHAREPOINT_RETRIES) {
            const retryDelayMs: number = Math.min(1000 * Math.pow(2, attemptCount - 1), 8000);
            window.setTimeout((): void => {
              if (isMounted) {
                loadAssets();
              }
            }, retryDelayMs);
            return;
          }

          setAssets([]);
          setAssetLoadError('Không tải được dữ liệu SharePoint sau 5 lần thử. Vui lòng liên hệ đội IT Support.');
          setIsLoadingAssets(false);
        });
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, [canAccessWorkspace, refreshAssets]);

  React.useEffect(() => {
    if (!canAccessWorkspace || isLoadingAssets) {
      if (!canAccessWorkspace) {
        setCartLineRecords([]);
      }
      return;
    }

    getCartItemsByUser(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((records: ICartLineRecord[]): void => {
        setCartLineRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải giỏ hàng từ SharePoint', error);
      });
  }, [canAccessWorkspace, isLoadingAssets, props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    if (!canAccessWorkspace) {
      setTransactionRecords([]);
      return;
    }

    getTransactionsByUser(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((records: IUserTransactionRecord[]): void => {
        setTransactionRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải lịch sử giao dịch của người dùng', error);
      });
  }, [canAccessWorkspace, props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    isUserAdmin(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((result: boolean): void => {
        setHasAdminRole(result);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể kiểm tra quyền admin', error);
        setHasAdminRole(false);
      });
  }, [props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    if (!canAccessWorkspace || !hasAdminRole) {
      setAdminTransactionRecords([]);
      return;
    }

    if (activeTab !== 'admin' && activeTab !== 'assets') {
      return;
    }

    getAllTransactions(props.siteUrl, props.spHttpClient)
      .then((records: IUserTransactionRecord[]): void => {
        setAdminTransactionRecords(records);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải danh sách giao dịch admin', error);
      });
  }, [activeTab, canAccessWorkspace, hasAdminRole, props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    if (!canAccessWorkspace) {
      setBankInfoMap({});
      return;
    }

    getAllBankInfoByLegalEntity(props.siteUrl, props.spHttpClient)
      .then((records: Record<string, IBankInfoRecord>) => {
        if (Object.keys(records).length) {
          setBankInfoMap(records);
        } else {
          return getBankInfoFromSharePoint(props.siteUrl, props.spHttpClient).then(
            (record: IBankInfoRecord | undefined): void => {
              if (record) {
                setBankInfoMap({ '': record });
              }
            }
          );
        }
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải thông tin ngân hàng', error);
        getBankInfoFromSharePoint(props.siteUrl, props.spHttpClient)
          .then((record: IBankInfoRecord | undefined): void => {
            if (record) {
              setBankInfoMap({ '': record });
            }
          })
          .catch((): void => {
            // silent
          });
      });
  }, [canAccessWorkspace, props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    if (!canAccessWorkspace) {
      return;
    }

    getMaxOrderConfig(props.siteUrl, props.spHttpClient)
      .then((value: number): void => {
        setMaxOrder(value);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải cấu hình MaxOrder', error);
      });

    getStopSellingConfig(props.siteUrl, props.spHttpClient)
      .then((isEnabled: boolean): void => {
        setIsStopSellingEnabled(isEnabled);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải cấu hình StopSelling', error);
        setIsStopSellingEnabled(false);
      });

    checkUserBlacklisted(props.siteUrl, props.spHttpClient, props.userEmail)
      .then((isBlacklisted: boolean): void => {
        setIsUserBlacklisted(isBlacklisted);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải cấu hình BlackListUser', error);
        setIsUserBlacklisted(false);
      });
  }, [canAccessWorkspace, props.siteUrl, props.spHttpClient, props.userEmail]);

  React.useEffect(() => {
    if (isStartOrderEnabled) {
      setIsAdminPreviewMode(false);
    }
  }, [isStartOrderEnabled]);

  React.useEffect(() => {
    if (!hasAdminRole && (activeTab === 'admin' || activeTab === 'assets')) {
      setActiveTab('orders');
    }
  }, [activeTab, hasAdminRole]);

  const checkStartOrderStatus = React.useCallback((): Promise<void> => {
    setIsCheckingStartOrder(true);
    setStartOrderError('');

    return getStartOrderConfig(props.siteUrl, props.spHttpClient)
      .then((isEnabled: boolean): void => {
        setIsStartOrderEnabled(isEnabled);
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể tải cấu hình StartOrder', error);
        setIsStartOrderEnabled(false);
        setStartOrderError('Không thể kiểm tra trạng thái phiên thanh lý. Vui lòng thử lại.');
      })
      .then((): void => {
        setIsCheckingStartOrder(false);
      });
  }, [props.siteUrl, props.spHttpClient]);

  React.useEffect(() => {
    checkStartOrderStatus().then((): void => undefined, (): void => undefined);
  }, [checkStartOrderStatus]);

  const orders: IOrderDetail[] = React.useMemo((): IOrderDetail[] => {
    return transactionRecords.map((record: IUserTransactionRecord): IOrderDetail => {
      return mapTransactionRecordToOrderDetail(record, assets, bankInfoMap);
    });
  }, [assets, bankInfoMap, transactionRecords]);

  const adminOrders: IOrderDetail[] = React.useMemo((): IOrderDetail[] => {
    return adminTransactionRecords.map((record: IUserTransactionRecord): IOrderDetail => {
      return mapTransactionRecordToOrderDetail(record, assets, bankInfoMap);
    });
  }, [adminTransactionRecords, assets, bankInfoMap]);

  const purchasedCount: number = React.useMemo((): number => {
    return transactionRecords.reduce((total: number, record: IUserTransactionRecord): number => {
      return total + record.totalQuantity;
    }, 0);
  }, [transactionRecords]);

  const getOrderById = React.useCallback(
    (orderId: string): IOrderDetail | undefined => {
      const sourceOrders: IOrderDetail[] = activeTab === 'admin' ? adminOrders : orders;
      const matchedOrder: IOrderDetail[] = sourceOrders.filter((order: IOrderDetail) => order.orderId === orderId);
      return matchedOrder.length ? matchedOrder[0] : undefined;
    },
    [activeTab, adminOrders, orders]
  );

  const updateTransactionStatusInState = React.useCallback((orderId: string, status: string): void => {
    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return { ...record, status };
      });
    });
    setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return { ...record, status };
      });
    });
  }, []);

  const updatePaymentStatusInState = React.useCallback((orderId: string, paymentStatus: string): void => {
    setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return { ...record, paymentStatus };
      });
    });
    setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
      return prevRecords.map((record: IUserTransactionRecord): IUserTransactionRecord => {
        if (record.orderId !== orderId) {
          return record;
        }

        return { ...record, paymentStatus };
      });
    });
  }, []);

  const handlePurchaseSuccess = React.useCallback(
    (orderDetail: IOrderDetail): void => {
      const nextRecord: IUserTransactionRecord = mapOrderDetailToTransactionRecord(orderDetail, props.userEmail);

      setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
        return [nextRecord].concat(prevRecords);
      });
      setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
        return [nextRecord].concat(prevRecords);
      });
      setSelectedOrderId(orderDetail.orderId);
      setActiveTab('orders');
    },
    [props.userEmail]
  );

  const handleRequestOpenSession = React.useCallback((): void => {
    if (!hasAdminRole || isOpeningSession || isCheckingStartOrder) {
      return;
    }

    setIsOpenSessionDialogVisible(true);
  }, [hasAdminRole, isCheckingStartOrder, isOpeningSession]);

  const handleCancelOpenSession = React.useCallback((): void => {
    if (isOpeningSession) {
      return;
    }

    setIsOpenSessionDialogVisible(false);
  }, [isOpeningSession]);

  const handleConfirmOpenSession = React.useCallback((): void => {
    if (!hasAdminRole || isOpeningSession) {
      return;
    }

    setIsOpeningSession(true);
    setStartOrderError('');

    updateStartOrderConfig(props.siteUrl, props.spHttpClient, true)
      .then((): Promise<void> => {
        setStartOrderSuccessMessage('Phiên thanh lý đã được mở thành công cho toàn hệ thống.');
        showToast('Đã mở phiên thanh lý thành công.', 'success');
        return checkStartOrderStatus();
      })
      .catch((error: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể mở phiên thanh lý', error);
        setStartOrderError('Không thể mở phiên thanh lý. Vui lòng thử lại.');
      })
      .then((): void => {
        setIsOpenSessionDialogVisible(false);
        setIsOpeningSession(false);
      })
      .catch((): void => undefined);
  }, [checkStartOrderStatus, hasAdminRole, isOpeningSession, props.siteUrl, props.spHttpClient, showToast]);

  const openOrderDetail = React.useCallback((order: IOrderDetail): void => {
    setSelectedOrderId(order.orderId);
  }, []);

  const showOrderList = React.useCallback((): void => {
    setSelectedOrderId(undefined);
    setActiveTab('orders');
  }, []);

  const showAdminList = React.useCallback((): void => {
    if (!hasAdminRole) {
      return;
    }

    setSelectedOrderId(undefined);
    setActiveTab('admin');
  }, [hasAdminRole]);

  const showAdminAssetList = React.useCallback((): void => {
    if (!hasAdminRole) {
      return;
    }

    setSelectedOrderId(undefined);
    setActiveTab('assets');
  }, [hasAdminRole]);

  const selectedOrder: IOrderDetail | undefined = selectedOrderId ? getOrderById(selectedOrderId) : undefined;
  const isAdminPreSessionMode: boolean = !isStartOrderEnabled && hasAdminRole && isAdminPreviewMode;

  return {
    showToast,
    activeTab,
    setActiveTab,
    transactionRecords,
    setTransactionRecords,
    adminTransactionRecords,
    setAdminTransactionRecords,
    selectedOrderId,
    setSelectedOrderId,
    assets,
    setAssets,
    isLoadingAssets,
    assetLoadError,
    refreshAssets,
    cartItems,
    refreshCart,
    bankInfoMap,
    hasAdminRole,
    maxOrder,
    isStopSellingEnabled,
    isUserBlacklisted,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    adminActionLoading,
    setAdminActionLoading,
    isStartOrderEnabled,
    isCheckingStartOrder,
    isOpeningSession,
    isOpenSessionDialogVisible,
    startOrderError,
    startOrderSuccessMessage,
    setStartOrderSuccessMessage,
    isAdminPreviewMode,
    setIsAdminPreviewMode,
    canAccessWorkspace,
    orders,
    adminOrders,
    purchasedCount,
    getOrderById,
    updateTransactionStatusInState,
    updatePaymentStatusInState,
    handlePurchaseSuccess,
    handleRequestOpenSession,
    handleCancelOpenSession,
    handleConfirmOpenSession,
    openOrderDetail,
    showOrderList,
    showAdminList,
    showAdminAssetList,
    selectedOrder,
    isAdminPreSessionMode,
    checkStartOrderStatus
  };
}
