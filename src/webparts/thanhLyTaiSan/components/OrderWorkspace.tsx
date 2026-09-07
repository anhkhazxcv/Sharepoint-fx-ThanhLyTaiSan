import * as React from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { WaitingLiquidationPage } from './WaitingLiquidationPage';
import { LoadingOverlay } from './LoadingOverlay';
import { AppButton, ConfirmDialog, NoticeBanner } from './common';
import type { IOrderDetail } from './orderDetail/types';
import styles from './OrderWorkspace.module.scss';
import {
  handleConfirmBulkHandover as runConfirmBulkHandover,
  handleConfirmBulkPayment as runConfirmBulkPayment,
  handleDeleteOrder,
  type IOrderActionsContext
} from './workspace/orderActions';
import { ROUTE_PATHS } from './workspace/routePaths';
import { useWorkspaceData } from './workspace/useWorkspaceData';
import { WorkspaceCatalogContext } from './workspace/workspaceContexts';
import { WorkspaceSidebar } from './workspace/WorkspaceSidebar';

const CartPage = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'cart-page' */ './CartPage');
  return { default: module.CartPage };
});

const AdminTransactionPage = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'admin-transaction-page' */ './orderDetail/AdminTransactionPage');
  return { default: module.AdminTransactionPage };
});

const AdminAssetMonitorPage = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'admin-asset-monitor-page' */ './orderDetail/AdminAssetMonitorPage');
  return { default: module.AdminAssetMonitorPage };
});

const OrderDetailPage = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'order-detail-page' */ './orderDetail/OrderDetailPage');
  return { default: module.OrderDetailPage };
});

const OrderListPage = React.lazy(async () => {
  const module = await import(/* webpackChunkName: 'order-list-page' */ './orderDetail/OrderListPage');
  return { default: module.OrderListPage };
});

function LazyTabFallback(): React.ReactElement {
  return <LoadingOverlay visible message="Đang tải nội dung..." />;
}

interface IRequireAdminProps {
  hasAdminRole: boolean;
  isChecked: boolean;
  children: React.ReactElement;
}

function RequireAdmin(props: IRequireAdminProps): React.ReactElement {
  if (!props.isChecked) {
    return <LazyTabFallback />;
  }

  if (!props.hasAdminRole) {
    return <Navigate to={ROUTE_PATHS.orders} replace />;
  }

  return props.children;
}

interface IOrderDetailRouteProps {
  orders: IOrderDetail[];
  isAdmin: boolean;
  isActionProcessing: boolean;
  fallbackPath: string;
  onConfirmPayment: (orderId: string) => void;
  onConfirmHandover: (orderId: string) => void;
}

function OrderDetailRoute(props: IOrderDetailRouteProps): React.ReactElement {
  const params = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const orderDetail: IOrderDetail | undefined = props.orders.filter(
    (order: IOrderDetail) => order.orderId === params.orderId
  )[0];

  if (!orderDetail) {
    return <Navigate to={props.fallbackPath} replace />;
  }

  return (
    <OrderDetailPage
      orderDetail={orderDetail}
      isAdmin={props.isAdmin}
      isActionProcessing={props.isActionProcessing}
      onConfirmPayment={props.onConfirmPayment}
      onConfirmHandover={props.onConfirmHandover}
      onBack={(): void => {
        navigate(props.fallbackPath);
      }}
    />
  );
}

export interface IOrderWorkspaceProps {
  userDisplayName: string;
  userEmail: string;
  userPhotoUrl?: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  powerAutomateEmailUrl?: string;
}

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  const workspace = useWorkspaceData(props);
  const navigate = useNavigate();

  const openBuyerOrder = React.useCallback(
    (order: IOrderDetail): void => {
      navigate(ROUTE_PATHS.orderDetail(order.orderId));
    },
    [navigate]
  );

  const openAdminOrder = React.useCallback(
    (order: IOrderDetail): void => {
      navigate(ROUTE_PATHS.adminOrderDetail(order.orderId));
    },
    [navigate]
  );

  const catalogContextValue = React.useMemo(
    () => ({
      assets: workspace.assets,
      cartItems: workspace.cartItems,
      refreshAssets: workspace.refreshAssets,
      refreshCart: workspace.refreshCart
    }),
    [workspace.assets, workspace.cartItems, workspace.refreshAssets, workspace.refreshCart]
  );

  const orderActionsContext: IOrderActionsContext = React.useMemo(
    (): IOrderActionsContext => ({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      powerAutomateEmailUrl: props.powerAutomateEmailUrl,
      hasAdminRole: workspace.hasAdminRole,
      adminActionLoading: workspace.adminActionLoading,
      adminTransactionRecords: workspace.adminTransactionRecords,
      currentAdminOrderId: workspace.currentAdminOrderId,
      getOrderById: workspace.getOrderById,
      updatePaymentStatusInState: workspace.updatePaymentStatusInState,
      updateTransactionStatusInState: workspace.updateTransactionStatusInState,
      setTransactionRecords: workspace.setTransactionRecords,
      setAdminTransactionRecords: workspace.setAdminTransactionRecords,
      setAssets: workspace.setAssets,
      navigateToAdminOrderList: (): void => {
        navigate(ROUTE_PATHS.admin);
      },
      setAdminActionLoading: workspace.setAdminActionLoading,
      showToast: workspace.showToast
    }),
    [
      navigate,
      props.siteUrl,
      props.spHttpClient,
      props.powerAutomateEmailUrl,
      workspace.hasAdminRole,
      workspace.adminActionLoading,
      workspace.adminTransactionRecords,
      workspace.currentAdminOrderId,
      workspace.getOrderById,
      workspace.updatePaymentStatusInState,
      workspace.updateTransactionStatusInState,
      workspace.setTransactionRecords,
      workspace.setAdminTransactionRecords,
      workspace.setAssets,
      workspace.setAdminActionLoading,
      workspace.showToast
    ]
  );

  const handleConfirmBulkPayment = React.useCallback(
    (orderIds: string[]): Promise<string[]> => {
      return runConfirmBulkPayment(orderActionsContext, orderIds);
    },
    [orderActionsContext]
  );

  const handleConfirmBulkHandover = React.useCallback(
    (orderIds: string[]): Promise<string[]> => {
      return runConfirmBulkHandover(orderActionsContext, orderIds);
    },
    [orderActionsContext]
  );

  const handleDeleteOrderCallback = React.useCallback(
    (orderId: string): Promise<boolean> => {
      return handleDeleteOrder(orderActionsContext, orderId);
    },
    [orderActionsContext]
  );

  const handleConfirmPayment = React.useCallback(
    (orderId: string): void => {
      handleConfirmBulkPayment([orderId]).then((): undefined => undefined, (): undefined => undefined);
    },
    [handleConfirmBulkPayment]
  );

  const handleConfirmHandover = React.useCallback(
    (orderId: string): void => {
      handleConfirmBulkHandover([orderId]).then((): undefined => undefined, (): undefined => undefined);
    },
    [handleConfirmBulkHandover]
  );

  if (!workspace.canAccessWorkspace) {
    return (
      <WaitingLiquidationPage
        isAdmin={workspace.hasAdminRole}
        isCheckingStatus={workspace.isCheckingStartOrder}
        isOpeningSession={workspace.isOpeningSession}
        isConfirmDialogOpen={workspace.isOpenSessionDialogVisible}
        errorMessage={workspace.startOrderError}
        onRetry={(): void => {
          if (workspace.isCheckingStartOrder || workspace.isOpeningSession) {
            return;
          }
          workspace.checkStartOrderStatus().then((): void => undefined, (): void => undefined);
        }}
        onRequestOpenSession={workspace.handleRequestOpenSession}
        onCancelOpenSession={workspace.handleCancelOpenSession}
        onConfirmOpenSession={workspace.handleConfirmOpenSession}
        onEnterAdminPreview={
          workspace.hasAdminRole
            ? (): void => {
                workspace.setIsAdminPreviewMode(true);
              }
            : undefined
        }
      />
    );
  }

  return (
    <WorkspaceCatalogContext.Provider value={catalogContextValue}>
    <div className={styles.workspace}>
      {workspace.isAdminPreSessionMode && (
        <div className={styles.bannerRow}>
          <NoticeBanner variant="warning" className={styles.bannerInline}>
            Phiên thanh lý chưa mở cho nhân viên. Bạn đang thao tác với quyền Admin — đơn hàng sẽ trừ tồn kho bình thường.
          </NoticeBanner>
          <div className={styles.adminPreSessionActions}>
            <AppButton
              variant="secondary"
              onClick={workspace.handleRequestOpenSession}
              disabled={workspace.isOpeningSession || workspace.isCheckingStartOrder}
            >
              Mở phiên thanh lý
            </AppButton>
          </div>
        </div>
      )}
      {!!workspace.startOrderSuccessMessage && (
        <div className={styles.bannerRow}>
          <NoticeBanner variant="success">{workspace.startOrderSuccessMessage}</NoticeBanner>
        </div>
      )}
      <LoadingOverlay
        visible={workspace.adminActionLoading !== undefined}
        message={
          workspace.adminActionLoading === 'payment'
            ? 'Đang xác nhận thanh toán...'
            : workspace.adminActionLoading === 'handover'
              ? 'Đang xác nhận bàn giao...'
              : 'Đang xóa đơn hàng...'
        }
      />
      <div className={styles.layout}>
        <WorkspaceSidebar
          isSidebarCollapsed={workspace.isSidebarCollapsed}
          hasAdminRole={workspace.hasAdminRole}
          ordersCount={workspace.orders.length}
          adminOrdersCount={workspace.adminOrders.length}
          userDisplayName={props.userDisplayName}
          userEmail={props.userEmail}
          userPhotoUrl={props.userPhotoUrl}
          onToggleCollapse={(): void => {
            workspace.setIsSidebarCollapsed((prevState: boolean) => !prevState);
          }}
        />

        <div className={styles.content}>
          <React.Suspense fallback={<LazyTabFallback />}>
            <Routes>
              <Route index element={<Navigate to={ROUTE_PATHS.register} replace />} />
              <Route
                path={ROUTE_PATHS.register}
                element={
                  <AssetLiquidationPage
                    userDisplayName={props.userDisplayName}
                    userEmail={props.userEmail}
                    spHttpClient={props.spHttpClient}
                    siteUrl={props.siteUrl}
                    purchasedCount={workspace.purchasedCount}
                    maxOrder={workspace.maxOrder}
                    isStopSellingEnabled={workspace.isStopSellingEnabled}
                    isUserBlacklisted={workspace.isUserBlacklisted}
                    assets={workspace.assets}
                    isLoadingAssets={workspace.isLoadingAssets}
                    assetLoadError={workspace.assetLoadError}
                    cartItems={workspace.cartItems}
                    onRefreshCart={workspace.refreshCart}
                  />
                }
              />
              <Route
                path={ROUTE_PATHS.cart}
                element={
                  <CartPage
                    userDisplayName={props.userDisplayName}
                    userEmail={props.userEmail}
                    spHttpClient={props.spHttpClient}
                    siteUrl={props.siteUrl}
                    purchasedCount={workspace.purchasedCount}
                    maxOrder={workspace.maxOrder}
                    isUserBlacklisted={workspace.isUserBlacklisted}
                    assets={workspace.assets}
                    isLoadingAssets={workspace.isLoadingAssets}
                    cartItems={workspace.cartItems}
                    onRefreshCart={workspace.refreshCart}
                    onAssetsRefresh={workspace.refreshAssets}
                    onPurchaseSuccess={workspace.handlePurchaseSuccess}
                  />
                }
              />
              <Route
                path={ROUTE_PATHS.orders}
                element={<OrderListPage orders={workspace.orders} onOpenOrder={openBuyerOrder} />}
              />
              <Route
                path={ROUTE_PATHS.orderDetailPattern}
                element={
                  <OrderDetailRoute
                    orders={workspace.orders}
                    isAdmin={workspace.hasAdminRole}
                    isActionProcessing={workspace.adminActionLoading !== undefined}
                    fallbackPath={ROUTE_PATHS.orders}
                    onConfirmPayment={handleConfirmPayment}
                    onConfirmHandover={handleConfirmHandover}
                  />
                }
              />
              <Route
                path={ROUTE_PATHS.adminAssets}
                element={
                  <RequireAdmin hasAdminRole={workspace.hasAdminRole} isChecked={workspace.isAdminRoleChecked}>
                    <AdminAssetMonitorPage
                      siteUrl={props.siteUrl}
                      spHttpClient={props.spHttpClient}
                      assets={workspace.assets}
                      transactions={workspace.adminTransactionRecords}
                      onOpenOrder={openAdminOrder}
                      onAssetsRefresh={workspace.refreshAssets}
                    />
                  </RequireAdmin>
                }
              />
              <Route
                path={ROUTE_PATHS.admin}
                element={
                  <RequireAdmin hasAdminRole={workspace.hasAdminRole} isChecked={workspace.isAdminRoleChecked}>
                    <AdminTransactionPage
                      orders={workspace.adminOrders}
                      onOpenOrder={openAdminOrder}
                      onConfirmBulkPayment={handleConfirmBulkPayment}
                      onConfirmBulkHandover={handleConfirmBulkHandover}
                      onDeleteOrder={handleDeleteOrderCallback}
                      isProcessing={workspace.adminActionLoading !== undefined}
                    />
                  </RequireAdmin>
                }
              />
              <Route
                path={ROUTE_PATHS.adminOrderDetailPattern}
                element={
                  <RequireAdmin hasAdminRole={workspace.hasAdminRole} isChecked={workspace.isAdminRoleChecked}>
                    <OrderDetailRoute
                      orders={workspace.adminOrders}
                      isAdmin={workspace.hasAdminRole}
                      isActionProcessing={workspace.adminActionLoading !== undefined}
                      fallbackPath={ROUTE_PATHS.admin}
                      onConfirmPayment={handleConfirmPayment}
                      onConfirmHandover={handleConfirmHandover}
                    />
                  </RequireAdmin>
                }
              />
              <Route path="*" element={<Navigate to={ROUTE_PATHS.register} replace />} />
            </Routes>
          </React.Suspense>
        </div>
      </div>
      <ConfirmDialog
        isOpen={workspace.isAdminPreSessionMode && workspace.isOpenSessionDialogVisible}
        title="Xác nhận mở phiên thanh lý"
        isBlocking={workspace.isOpeningSession}
        onDismiss={workspace.handleCancelOpenSession}
        secondaryAction={{
          label: 'Hủy',
          onClick: workspace.handleCancelOpenSession,
          disabled: workspace.isOpeningSession
        }}
        primaryAction={{
          label: 'Xác nhận',
          loadingLabel: 'Đang mở phiên...',
          onClick: workspace.handleConfirmOpenSession,
          disabled: workspace.isOpeningSession
        }}
      >
        Bạn có chắc chắn muốn mở phiên thanh lý cho toàn hệ thống không?
      </ConfirmDialog>
    </div>
    </WorkspaceCatalogContext.Provider>
  );
}
