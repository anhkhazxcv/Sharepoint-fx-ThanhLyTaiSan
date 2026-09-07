import * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import loadingMAG from '../assets/loadingMAG.gif';
import { CartPanel } from './CartPanel';
import { ConfirmDialog, DialogSection, NoticeBanner, PageHeader } from './common';
import type { IAssetItem, ICartItem } from './types';
import type { IOrderDetail } from './orderDetail/types';
import { clearCartItems, upsertCartItem } from './services/cartService';
import { LoadingOverlay } from './LoadingOverlay';
import { useToast } from './ToastProvider';
import {
  createTransactionItem,
  generateUniqueOrderId,
  getStockReservationErrorMessage,
  isStockReservationError,
  reserveStockForOrder,
  restoreStockDeductions,
  type IAppliedStockDeduction
} from './services/orderTransactionService';
import styles from './CartPage.module.scss';

export interface ICartPageProps {
  userDisplayName?: string;
  userEmail: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  purchasedCount: number;
  maxOrder?: number;
  assets: IAssetItem[];
  isLoadingAssets: boolean;
  isUserBlacklisted?: boolean;
  cartItems: ICartItem[];
  onRefreshCart: () => Promise<ICartItem[]>;
  onAssetsRefresh: () => Promise<IAssetItem[]>;
  onPurchaseSuccess?: (orderDetail: IOrderDetail) => void;
}

export function CartPage(props: ICartPageProps): React.ReactElement {
  const displayName: string = props.userDisplayName || '';
  const { showToast } = useToast();
  const cartItems: ICartItem[] = props.cartItems;
  const [selectedCartProductCodes, setSelectedCartProductCodes] = React.useState<string[]>([]);
  const [isCheckingOut, setIsCheckingOut] = React.useState<boolean>(false);
  const [isCheckoutConfirmDialogOpen, setIsCheckoutConfirmDialogOpen] = React.useState<boolean>(false);
  const isLoading: boolean = props.isLoadingAssets;
  const [removingProductCodes, setRemovingProductCodes] = React.useState<string[]>([]);
  const remainingLimit: number = Math.max((props.maxOrder ?? 5) - props.purchasedCount, 0);
  const cartQuantity: number = React.useMemo(
    () => cartItems.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0),
    [cartItems]
  );

  React.useEffect(() => {
    const nextCodes: string[] = cartItems.map((item: ICartItem) => item.productCode);
    setSelectedCartProductCodes((prevSelected: string[]) => {
      return prevSelected.filter((code: string) => nextCodes.indexOf(code) >= 0);
    });
  }, [cartItems]);

  const handleToggleCartSelection = React.useCallback((productCode: string, checked: boolean) => {
    setSelectedCartProductCodes((prevState: string[]) => {
      if (checked) {
        return prevState.indexOf(productCode) >= 0 ? prevState : prevState.concat(productCode);
      }

      return prevState.filter((code: string) => code !== productCode);
    });
  }, []);

  const handleCartQuantityChange = React.useCallback(
    (productCode: string, quantity: number) => {
      const cartItem: ICartItem | undefined = cartItems.filter((item: ICartItem) => item.productCode === productCode)[0];

      if (!cartItem) {
        return;
      }

      const sanitizedQuantity: number = Math.max(1, Math.min(quantity || 1, cartItem.maxQuantity));
      const otherQuantity: number = cartQuantity - cartItem.quantity;
      const maxAvailableForItem: number = Math.max(remainingLimit - otherQuantity, 0);

      if (maxAvailableForItem < 1) {
        showToast('Bạn đã đạt giới hạn mua tối đa.', 'error');
        return;
      }

      if (sanitizedQuantity > maxAvailableForItem) {
        showToast('Bạn đã đăng ký vượt quá giới hạn mua. Vui lòng giảm số lượng.', 'error');
      }

      const allowedQuantity: number = Math.min(sanitizedQuantity, maxAvailableForItem);

      upsertCartItem({
        siteUrl: props.siteUrl,
        spHttpClient: props.spHttpClient,
        buyerName: displayName,
        buyerEmail: props.userEmail,
        productCode,
        quantity: allowedQuantity,
        unitPrice: cartItem.unitPrice
      })
        .then(() => props.onRefreshCart())
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error('Không thể cập nhật giỏ hàng', error);
          showToast('Không thể cập nhật giỏ hàng trên SharePoint.', 'error');
        });
    },
    [cartItems, cartQuantity, displayName, props.onRefreshCart, props.siteUrl, props.spHttpClient, props.userEmail, remainingLimit, showToast]
  );

  const handleRemoveCartItem = React.useCallback(
    (productCode: string) => {
      setRemovingProductCodes((prev: string[]) => prev.concat(productCode));

      clearCartItems({
        siteUrl: props.siteUrl,
        spHttpClient: props.spHttpClient,
        buyerEmail: props.userEmail,
        productCodes: [productCode]
      })
        .then(() => props.onRefreshCart())
        .catch((error: Error) => {
          // eslint-disable-next-line no-console
          console.error('Không thể xóa khỏi giỏ hàng', error);
          showToast('Không thể xóa sản phẩm khỏi giỏ hàng.', 'error');
        })
        .then(
          () => {
            setRemovingProductCodes((prev: string[]) => prev.filter((c: string) => c !== productCode));
          },
          () => {
            setRemovingProductCodes((prev: string[]) => prev.filter((c: string) => c !== productCode));
          }
        );
    },
    [props.onRefreshCart, props.siteUrl, props.spHttpClient, props.userEmail, showToast]
  );

  const selectedCheckoutItems: ICartItem[] = React.useMemo(
    () => cartItems.filter((item: ICartItem) => selectedCartProductCodes.indexOf(item.productCode) >= 0),
    [cartItems, selectedCartProductCodes]
  );

  const handleCancelCheckoutConfirm = React.useCallback((): void => {
    if (isCheckingOut) {
      return;
    }

    setIsCheckoutConfirmDialogOpen(false);
  }, [isCheckingOut]);

  const handleRequestCheckout = React.useCallback((): void => {
    if (props.isUserBlacklisted) {
      showToast('Tài khoản của bạn không được phép đăng ký mua hàng.', 'error');
      return;
    }

    if (!selectedCheckoutItems.length) {
      showToast('Vui lòng chọn ít nhất một sản phẩm trong giỏ hàng.', 'error');
      return;
    }

    setIsCheckoutConfirmDialogOpen(true);
  }, [props.isUserBlacklisted, selectedCheckoutItems.length, showToast]);

  const executeCheckout = React.useCallback(() => {
    const selectedItems: ICartItem[] = selectedCheckoutItems;

    if (!selectedItems.length) {
      showToast('Vui lòng chọn ít nhất một sản phẩm trong giỏ hàng.', 'error');
      setIsCheckoutConfirmDialogOpen(false);
      return;
    }

    setIsCheckingOut(true);

    reserveStockForOrder({
      siteUrl: props.siteUrl,
      spHttpClient: props.spHttpClient,
      items: selectedItems.map((item: ICartItem) => ({
        productCode: item.productCode,
        quantity: item.quantity,
        assetName: item.assetName
      }))
    })
      .then((reservation) => {
        return generateUniqueOrderId(props.siteUrl, props.spHttpClient).then((generatedOrderId: string) => ({
          generatedOrderId,
          deductions: reservation.deductions
        }));
      })
      .then((payload: { generatedOrderId: string; deductions: IAppliedStockDeduction[] }) => {
        const now: Date = new Date();
        const totalAmount: number = selectedItems.reduce((sum: number, item: ICartItem) => sum + item.lineTotal, 0);
        const nextOrder: IOrderDetail = {
          orderId: payload.generatedOrderId,
          orderCode: payload.generatedOrderId,
          buyerName: displayName,
          purchaseDate: now.toISOString(),
          totalAmount,
          currentStep: 'Thanh toán',
          paymentStatus: 'Chờ xác nhận',
          handoverStatus: 'Chưa bàn giao',
          items: selectedItems.map((item: ICartItem, index: number) => ({
            id: payload.generatedOrderId + (index < 9 ? '0' + String(index + 1) : String(index + 1)),
            assetId: item.assetId,
            assetCode: item.productCode,
            assetName: item.assetName,
            condition: item.condition,
            site: item.site,
            legalEntity: item.legalEntity,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.lineTotal,
            imageUrl: item.imageUrl,
            barcode: item.barcode
          }))
        };

        return createTransactionItem({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerName: displayName,
          buyerEmail: props.userEmail,
          orderDetail: nextOrder
        })
          .then(() => ({
            createdOrder: nextOrder,
            deductions: payload.deductions
          }))
          .catch((createOrderError: Error) =>
            restoreStockDeductions(props.siteUrl, props.spHttpClient, payload.deductions).then(() => {
              throw createOrderError;
            })
          );
      })
      .then((payload: { createdOrder: IOrderDetail; deductions: IAppliedStockDeduction[] }) => {
        return clearCartItems({
          siteUrl: props.siteUrl,
          spHttpClient: props.spHttpClient,
          buyerEmail: props.userEmail,
          productCodes: selectedItems.map((item: ICartItem) => item.productCode)
        }).then(() => payload.createdOrder);
      })
      .then((createdOrder: IOrderDetail) => {
        return Promise.all([props.onAssetsRefresh(), props.onRefreshCart()]).then(() => createdOrder);
      })
      .then((createdOrder: IOrderDetail) => {
        setSelectedCartProductCodes([]);
        showToast('Tạo đơn hàng thành công! Mã đơn: ' + createdOrder.orderCode, 'success');

        if (props.onPurchaseSuccess) {
          props.onPurchaseSuccess(createdOrder);
        }
      })
      .catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Không thể tạo đơn mua trên SharePoint', error);

        if (isStockReservationError(error)) {
          props
            .onAssetsRefresh()
            .then(() => props.onRefreshCart())
            .catch((refreshError: Error) => {
              // eslint-disable-next-line no-console
              console.error('Không thể làm mới danh sách tài sản sau khi giữ tồn thất bại', refreshError);
            });

          showToast(getStockReservationErrorMessage(error), 'error');
          return;
        }

        showToast('Không thể tạo đơn mua. Tồn kho đã được hoàn tác nếu đã bị trừ.', 'error');
      })
      .then(
        () => {
          setIsCheckingOut(false);
          setIsCheckoutConfirmDialogOpen(false);
        },
        () => {
          setIsCheckingOut(false);
          setIsCheckoutConfirmDialogOpen(false);
        }
      );
  }, [displayName, props.onAssetsRefresh, props.onRefreshCart, props.onPurchaseSuccess, props.siteUrl, props.spHttpClient, props.userEmail, selectedCheckoutItems, showToast]);

  return (
    <div className={styles.page}>
      <LoadingOverlay
        visible={isCheckingOut || removingProductCodes.length > 0}
        message={isCheckingOut ? 'Đang tạo đơn hàng...' : 'Đang xóa sản phẩm...'}
      />
      <PageHeader
        title="Quản lý giỏ hàng"
        subtitle="Cập nhật số lượng, xóa sản phẩm và tạo đơn mua từ các mục đã chọn."
      />

      {props.isUserBlacklisted && (
        <NoticeBanner variant="warning">Tài khoản của bạn không được phép đăng ký mua hàng.</NoticeBanner>
      )}

      {isLoading ? (
        <div className={styles.loadingState}>
          <img src={loadingMAG} alt="" className={styles.loadingImage} />
          <span>Đang tải giỏ hàng...</span>
        </div>
      ) : (
        <CartPanel
          items={cartItems}
          selectedProductCodes={selectedCartProductCodes}
          maxSelectableQuantity={remainingLimit}
          isCheckingOut={isCheckingOut}
          isCheckoutDisabled={!!props.isUserBlacklisted}
          removingProductCodes={removingProductCodes}
          onToggleSelection={handleToggleCartSelection}
          onQuantityChange={handleCartQuantityChange}
          onRemove={handleRemoveCartItem}
          onCheckoutSelected={handleRequestCheckout}
        />
      )}
      <ConfirmDialog
        isOpen={isCheckoutConfirmDialogOpen}
        title="Xác nhận tạo đơn hàng"
        titleId="cart-checkout-dialog-title"
        isBlocking={isCheckingOut}
        onDismiss={handleCancelCheckoutConfirm}
        secondaryAction={{
          label: 'Hủy',
          onClick: handleCancelCheckoutConfirm,
          disabled: isCheckingOut
        }}
        primaryAction={{
          label: 'Xác nhận tạo đơn',
          loadingLabel: 'Đang tạo đơn...',
          onClick: executeCheckout,
          disabled: isCheckingOut
        }}
      >
        <DialogSection warning>Hàng đã xác nhận không thể hủy và đổi trả.</DialogSection>
        <DialogSection>
          Bạn sắp tạo đơn với {String(selectedCheckoutItems.length)} sản phẩm đã chọn.
        </DialogSection>
      </ConfirmDialog>
    </div>
  );
}
