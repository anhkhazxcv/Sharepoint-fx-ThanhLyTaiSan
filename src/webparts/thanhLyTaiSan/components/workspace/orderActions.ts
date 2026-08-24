import type { Dispatch, SetStateAction } from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import type { IOrderDetail, IOrderItem } from '../orderDetail/types';
import type { IUserTransactionRecord } from '../services/orderTransactionService';
import {
  deleteUnpaidTransactionOrder,
  updateOrderPaymentStatus,
  updateTransactionStatus
} from '../services/orderTransactionService';
import { runWithConcurrency } from '../services/batchConcurrencyUtils';
import { sendEmail, type IEmailProduct } from '../services/emailService';
import type { TToastVariant } from '../ToastProvider';
import type { IAssetItem } from '../types';
import { applyRestockToAssetState } from './orderMappers';

export type TAdminActionLoading = 'payment' | 'handover' | 'delete' | undefined;

const ADMIN_BULK_ACTION_CONCURRENCY: number = 4;

export interface IOrderActionsContext {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  powerAutomateEmailUrl?: string;
  hasAdminRole: boolean;
  adminActionLoading: TAdminActionLoading;
  adminTransactionRecords: IUserTransactionRecord[];
  selectedOrderId: string | undefined;
  getOrderById: (orderId: string) => IOrderDetail | undefined;
  updatePaymentStatusInState: (orderId: string, paymentStatus: string) => void;
  updateTransactionStatusInState: (orderId: string, status: string) => void;
  setTransactionRecords: Dispatch<SetStateAction<IUserTransactionRecord[]>>;
  setAdminTransactionRecords: Dispatch<SetStateAction<IUserTransactionRecord[]>>;
  setAssets: Dispatch<SetStateAction<IAssetItem[]>>;
  setSelectedOrderId: Dispatch<SetStateAction<string | undefined>>;
  setAdminActionLoading: Dispatch<SetStateAction<TAdminActionLoading>>;
  showToast: (message: string, variant?: TToastVariant) => void;
}

function mapOrderItemsToEmailProducts(items: IOrderItem[]): IEmailProduct[] {
  return items.map((item: IOrderItem): IEmailProduct => ({
    productName: item.assetName,
    variant: item.condition,
    quantity: item.quantity,
    price: item.unitPrice
  }));
}

export function confirmPaymentForOrder(ctx: IOrderActionsContext, orderId: string): Promise<string> {
  const targetOrder: IOrderDetail | undefined = ctx.getOrderById(orderId);

  if (!targetOrder || !targetOrder.items.length) {
    return Promise.reject(new Error('Không tìm thấy đơn hàng hợp lệ để xác nhận thanh toán.'));
  }

  return updateOrderPaymentStatus({
    siteUrl: ctx.siteUrl,
    spHttpClient: ctx.spHttpClient,
    orderId: targetOrder.orderCode,
    paymentStatus: 'Đã thanh toán'
  })
    .then((): Promise<void> => {
      return updateTransactionStatus({
        siteUrl: ctx.siteUrl,
        spHttpClient: ctx.spHttpClient,
        orderId: targetOrder.orderCode,
        status: 'Chờ bàn giao'
      });
    })
    .then((): string => {
      ctx.updatePaymentStatusInState(orderId, 'Đã thanh toán');
      ctx.updateTransactionStatusInState(orderId, 'Chờ bàn giao');

      if (targetOrder.buyerEmail) {
        sendEmail(ctx.powerAutomateEmailUrl || '', {
          recipient: targetOrder.buyerEmail,
          type: 'XacNhanThanhToan',
          order: {
            orderCode: targetOrder.orderCode,
            orderDateTime: targetOrder.purchaseDate,
            totalAmount: targetOrder.totalAmount
          },
          products: mapOrderItemsToEmailProducts(targetOrder.items)
        }).catch((emailError: Error): void => {
          // eslint-disable-next-line no-console
          console.error('Không thể gửi email thông báo thanh toán', emailError);
        });
      }

      return orderId;
    });
}

export function confirmHandoverForOrder(ctx: IOrderActionsContext, orderId: string): Promise<string> {
  const targetOrder: IOrderDetail | undefined = ctx.getOrderById(orderId);

  if (!targetOrder) {
    return Promise.reject(new Error('Không tìm thấy đơn hàng hợp lệ để xác nhận bàn giao.'));
  }

  return updateTransactionStatus({
    siteUrl: ctx.siteUrl,
    spHttpClient: ctx.spHttpClient,
    orderId: targetOrder.orderCode,
    status: 'Đã bàn giao'
  }).then((): string => {
    ctx.updateTransactionStatusInState(orderId, 'Đã bàn giao');

    if (targetOrder.buyerEmail) {
      sendEmail(ctx.powerAutomateEmailUrl || '', {
        recipient: targetOrder.buyerEmail,
        type: 'XacNhanBanGiao',
        order: {
          orderCode: targetOrder.orderCode,
          orderDateTime: targetOrder.purchaseDate,
          totalAmount: targetOrder.totalAmount
        },
        products: mapOrderItemsToEmailProducts(targetOrder.items)
      }).catch((emailError: Error): void => {
        // eslint-disable-next-line no-console
        console.error('Không thể gửi email thông báo bàn giao', emailError);
      });
    }

    return orderId;
  });
}

export function handleConfirmBulkPayment(ctx: IOrderActionsContext, orderIds: string[]): Promise<string[]> {
  if (!ctx.hasAdminRole || ctx.adminActionLoading !== undefined || !orderIds.length) {
    return Promise.resolve([]);
  }

  ctx.setAdminActionLoading('payment');

  return runWithConcurrency(
    orderIds,
    ADMIN_BULK_ACTION_CONCURRENCY,
    (orderId: string): Promise<{ orderId: string; success: boolean }> => {
      return confirmPaymentForOrder(ctx, orderId)
        .then((confirmedOrderId: string): { orderId: string; success: boolean } => ({
          orderId: confirmedOrderId,
          success: true
        }))
        .catch((error: Error): { orderId: string; success: boolean } => {
          // eslint-disable-next-line no-console
          console.error('Không thể xác nhận thanh toán', error);
          return { orderId, success: false };
        });
    }
  )
    .then((results: { orderId: string; success: boolean }[]): string[] => {
      const successOrderIds: string[] = results
        .filter((result: { orderId: string; success: boolean }): boolean => result.success)
        .map((result: { orderId: string; success: boolean }): string => result.orderId);
      const failedCount: number = results.length - successOrderIds.length;

      if (successOrderIds.length) {
        ctx.showToast(
          successOrderIds.length === 1
            ? 'Xác nhận thanh toán đơn hàng thành công.'
            : 'Xác nhận thanh toán thành công ' + String(successOrderIds.length) + ' đơn hàng.',
          'success'
        );
      }

      if (failedCount) {
        ctx.showToast(
          orderIds.length === 1
            ? 'Không thể xác nhận thanh toán. Vui lòng thử lại.'
            : 'Có ' + String(failedCount) + ' đơn hàng không thể xác nhận thanh toán. Vui lòng thử lại.',
          'error'
        );
      }

      return successOrderIds;
    })
    .then((successOrderIds: string[]): string[] => {
      ctx.setAdminActionLoading(undefined);
      return successOrderIds;
    })
    .catch((error: Error): Promise<string[]> => {
      // eslint-disable-next-line no-console
      console.error('Không thể xác nhận thanh toán hàng loạt', error);
      ctx.setAdminActionLoading(undefined);
      ctx.showToast('Không thể xác nhận thanh toán. Vui lòng thử lại.', 'error');
      return Promise.resolve([]);
    });
}

export function handleConfirmBulkHandover(ctx: IOrderActionsContext, orderIds: string[]): Promise<string[]> {
  if (!ctx.hasAdminRole || ctx.adminActionLoading !== undefined || !orderIds.length) {
    return Promise.resolve([]);
  }

  ctx.setAdminActionLoading('handover');

  return runWithConcurrency(
    orderIds,
    ADMIN_BULK_ACTION_CONCURRENCY,
    (orderId: string): Promise<{ orderId: string; success: boolean }> => {
      return confirmHandoverForOrder(ctx, orderId)
        .then((confirmedOrderId: string): { orderId: string; success: boolean } => ({
          orderId: confirmedOrderId,
          success: true
        }))
        .catch((error: Error): { orderId: string; success: boolean } => {
          // eslint-disable-next-line no-console
          console.error('Không thể xác nhận bàn giao', error);
          return { orderId, success: false };
        });
    }
  )
    .then((results: { orderId: string; success: boolean }[]): string[] => {
      const successOrderIds: string[] = results
        .filter((result: { orderId: string; success: boolean }): boolean => result.success)
        .map((result: { orderId: string; success: boolean }): string => result.orderId);
      const failedCount: number = results.length - successOrderIds.length;

      if (successOrderIds.length) {
        ctx.showToast(
          successOrderIds.length === 1
            ? 'Xác nhận bàn giao tài sản thành công.'
            : 'Xác nhận bàn giao thành công ' + String(successOrderIds.length) + ' đơn hàng.',
          'success'
        );
      }

      if (failedCount) {
        ctx.showToast(
          orderIds.length === 1
            ? 'Không thể xác nhận bàn giao. Vui lòng thử lại.'
            : 'Có ' + String(failedCount) + ' đơn hàng không thể xác nhận bàn giao. Vui lòng thử lại.',
          'error'
        );
      }

      return successOrderIds;
    })
    .then((successOrderIds: string[]): string[] => {
      ctx.setAdminActionLoading(undefined);
      return successOrderIds;
    })
    .catch((error: Error): Promise<string[]> => {
      // eslint-disable-next-line no-console
      console.error('Không thể xác nhận bàn giao hàng loạt', error);
      ctx.setAdminActionLoading(undefined);
      ctx.showToast('Không thể xác nhận bàn giao. Vui lòng thử lại.', 'error');
      return Promise.resolve([]);
    });
}

export function handleDeleteOrder(ctx: IOrderActionsContext, orderId: string): Promise<boolean> {
  if (!ctx.hasAdminRole || ctx.adminActionLoading !== undefined) {
    return Promise.resolve(false);
  }

  const targetRecord: IUserTransactionRecord | undefined = ctx.adminTransactionRecords.filter(
    (record: IUserTransactionRecord): boolean => record.orderId === orderId
  )[0];

  if (!targetRecord) {
    ctx.showToast('Không tìm thấy đơn hàng để xóa.', 'error');
    return Promise.resolve(false);
  }

  if (targetRecord.paymentStatus === 'Đã thanh toán') {
    ctx.showToast('Chỉ có thể xóa đơn chưa được xác nhận thanh toán.', 'error');
    return Promise.resolve(false);
  }

  ctx.setAdminActionLoading('delete');

  return deleteUnpaidTransactionOrder({
    siteUrl: ctx.siteUrl,
    spHttpClient: ctx.spHttpClient,
    orderId: targetRecord.orderCode,
    orderItems: targetRecord.items
  })
    .then((): boolean => {
      ctx.setTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
        return prevRecords.filter((record: IUserTransactionRecord): boolean => record.orderId !== orderId);
      });
      ctx.setAdminTransactionRecords((prevRecords: IUserTransactionRecord[]): IUserTransactionRecord[] => {
        return prevRecords.filter((record: IUserTransactionRecord): boolean => record.orderId !== orderId);
      });
      ctx.setAssets((prevAssets: IAssetItem[]): IAssetItem[] => {
        return applyRestockToAssetState(prevAssets, targetRecord.items);
      });

      if (ctx.selectedOrderId === orderId) {
        ctx.setSelectedOrderId(undefined);
      }

      ctx.showToast('Xóa đơn hàng thành công.', 'success');
      return true;
    })
    .catch((error: Error): boolean => {
      // eslint-disable-next-line no-console
      console.error('Không thể xóa đơn hàng chưa thanh toán', error);
      ctx.showToast('Không thể xóa đơn hàng. Vui lòng thử lại.', 'error');
      return false;
    })
    .then((result: boolean): boolean => {
      ctx.setAdminActionLoading(undefined);
      return result;
    });
}
