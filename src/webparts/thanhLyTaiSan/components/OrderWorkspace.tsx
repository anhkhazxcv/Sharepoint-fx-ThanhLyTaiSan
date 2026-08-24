import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { AssetLiquidationPage } from './AssetLiquidationPage';
import { WaitingLiquidationPage } from './WaitingLiquidationPage';
import { LoadingOverlay } from './LoadingOverlay';
import { AppButton, ConfirmDialog, NoticeBanner } from './common';
import styles from './OrderWorkspace.module.scss';
import {
  handleConfirmBulkHandover as runConfirmBulkHandover,
  handleConfirmBulkPayment as runConfirmBulkPayment,
  handleDeleteOrder,
  type IOrderActionsContext
} from './workspace/orderActions';
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

export interface IOrderWorkspaceProps {
  userDisplayName: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  powerAutomateEmailUrl?: string;
}

export function OrderWorkspace(props: IOrderWorkspaceProps): React.ReactElement {
  const workspace = useWorkspaceData(props);

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
      selectedOrderId: workspace.selectedOrderId,
      getOrderById: workspace.getOrderById,
      updatePaymentStatusInState: workspace.updatePaymentStatusInState,
      updateTransactionStatusInState: workspace.updateTransactionStatusInState,
      setTransactionRecords: workspace.setTransactionRecords,
      setAdminTransactionRecords: workspace.setAdminTransactionRecords,
      setAssets: workspace.setAssets,
      setSelectedOrderId: workspace.setSelectedOrderId,
      setAdminActionLoading: workspace.setAdminActionLoading,
      showToast: workspace.showToast
    }),
    [
      props.siteUrl,
      props.spHttpClient,
      props.powerAutomateEmailUrl,
      workspace.hasAdminRole,
      workspace.adminActionLoading,
      workspace.adminTransactionRecords,
      workspace.selectedOrderId,
      workspace.getOrderById,
      workspace.updatePaymentStatusInState,
      workspace.updateTransactionStatusInState,
      workspace.setTransactionRecords,
      workspace.setAdminTransactionRecords,
      workspace.setAssets,
      workspace.setSelectedOrderId,
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
          activeTab={workspace.activeTab}
          isSidebarCollapsed={workspace.isSidebarCollapsed}
          hasAdminRole={workspace.hasAdminRole}
          ordersCount={workspace.orders.length}
          adminOrdersCount={workspace.adminOrders.length}
          onToggleCollapse={(): void => {
            workspace.setIsSidebarCollapsed((prevState: boolean) => !prevState);
          }}
          onSelectTab={workspace.setActiveTab}
          onShowOrderList={workspace.showOrderList}
          onShowAdminList={workspace.showAdminList}
          onShowAdminAssetList={workspace.showAdminAssetList}
        />

        <div className={styles.content}>
          {workspace.activeTab === 'register' ? (
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
          ) : (
            <React.Suspense fallback={<LazyTabFallback />}>
              {workspace.activeTab === 'cart' ? (
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
              ) : workspace.selectedOrder ? (
                <OrderDetailPage
                  orderDetail={workspace.selectedOrder}
                  isAdmin={workspace.hasAdminRole}
                  isActionProcessing={workspace.adminActionLoading !== undefined}
                  onConfirmPayment={handleConfirmPayment}
                  onConfirmHandover={handleConfirmHandover}
                  onBack={(): void => {
                    workspace.setSelectedOrderId(undefined);
                  }}
                />
              ) : workspace.hasAdminRole && workspace.activeTab === 'assets' ? (
                <AdminAssetMonitorPage
                  siteUrl={props.siteUrl}
                  spHttpClient={props.spHttpClient}
                  assets={workspace.assets}
                  transactions={workspace.adminTransactionRecords}
                  onOpenOrder={workspace.openOrderDetail}
                  onAssetsRefresh={workspace.refreshAssets}
                />
              ) : workspace.hasAdminRole && workspace.activeTab === 'admin' ? (
                <AdminTransactionPage
                  orders={workspace.adminOrders}
                  onOpenOrder={workspace.openOrderDetail}
                  onConfirmBulkPayment={handleConfirmBulkPayment}
                  onConfirmBulkHandover={handleConfirmBulkHandover}
                  onDeleteOrder={handleDeleteOrderCallback}
                  isProcessing={workspace.adminActionLoading !== undefined}
                />
              ) : (
                <OrderListPage orders={workspace.orders} onOpenOrder={workspace.openOrderDetail} />
              )}
            </React.Suspense>
          )}
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
