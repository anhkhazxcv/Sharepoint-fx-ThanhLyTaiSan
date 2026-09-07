import * as React from 'react';
import { FiAlertTriangle, FiClipboard, FiLock } from 'react-icons/fi';
import type { IOrderItem } from './types';
import { formatCurrency } from './utils/format';
import { buildVietQrImageUrl, DEFAULT_QR_BANK_SLUG } from '../services/bankInfoService';
import styles from './PaymentManagementTable.module.scss';

export interface IPaymentManagementTableProps {
  items: IOrderItem[];
}

interface IPaymentGroupData {
  legalEntity: string;
  bankAccountName: string;
  bankAccountNumber: string;
  groupTotal: number;
  qrImageUrl: string;
  transferContent: string;
  items: IOrderItem[];
}

function buildGroups(items: IOrderItem[]): IPaymentGroupData[] {
  const groupMap: Map<string, IPaymentGroupData> = new Map<string, IPaymentGroupData>();
  const order: string[] = [];

  items.forEach(function (item: IOrderItem): void {
    const key: string = item.legalEntity || '';
    if (!groupMap.has(key)) {
      order.push(key);
      groupMap.set(key, {
        legalEntity: key,
        bankAccountName: item.bankAccountName || '',
        bankAccountNumber: item.bankAccountNumber || '',
        groupTotal: 0,
        qrImageUrl: '',
        transferContent: item.transferContent || '',
        items: []
      });
    }
    const group: IPaymentGroupData = groupMap.get(key) as IPaymentGroupData;
    group.groupTotal += item.amount;
    group.items.push(item);
  });

  order.forEach(function (key: string): void {
    const group: IPaymentGroupData = groupMap.get(key) as IPaymentGroupData;
    if (group.bankAccountNumber) {
      group.qrImageUrl = buildVietQrImageUrl(
        DEFAULT_QR_BANK_SLUG,
        group.bankAccountNumber,
        'compact2',
        group.groupTotal,
        group.transferContent,
        group.bankAccountName
      );
    }
  });

  return order.map(function (key: string): IPaymentGroupData {
    return groupMap.get(key) as IPaymentGroupData;
  });
}

function VietQrBadge(): React.ReactElement {
  return (
    <span className={styles.vietqrBadge}>
      <svg className={styles.vietqrIcon} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="#00A95C" />
        <rect x="4" y="4" width="10" height="10" rx="1.5" fill="white" />
        <rect x="5.5" y="5.5" width="7" height="7" rx="1" fill="#00A95C" />
        <rect x="7" y="7" width="4" height="4" fill="white" />
        <rect x="18" y="4" width="10" height="10" rx="1.5" fill="white" />
        <rect x="19.5" y="5.5" width="7" height="7" rx="1" fill="#00A95C" />
        <rect x="21" y="7" width="4" height="4" fill="white" />
        <rect x="4" y="18" width="10" height="10" rx="1.5" fill="white" />
        <rect x="5.5" y="19.5" width="7" height="7" rx="1" fill="#00A95C" />
        <rect x="7" y="21" width="4" height="4" fill="white" />
        <rect x="18" y="18" width="4" height="4" fill="white" />
        <rect x="24" y="18" width="4" height="4" fill="white" />
        <rect x="18" y="24" width="4" height="4" fill="white" />
        <rect x="24" y="24" width="4" height="4" fill="white" />
      </svg>
      VietQR
    </span>
  );
}

export function PaymentManagementTable(props: IPaymentManagementTableProps): React.ReactElement {
  if (!props.items.length) {
    return (
      <div className={styles.emptyState}>
        <FiClipboard className={styles.emptyIcon} aria-hidden="true" />
        <strong>Chưa có tài sản trong đơn hàng</strong>
        <span>Dữ liệu sẽ hiển thị tại đây khi đơn hàng được tạo.</span>
      </div>
    );
  }

  const groups: IPaymentGroupData[] = buildGroups(props.items);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableHeader}>
        <h2 className={styles.tableTitle}>Bảng Quản Lý Thanh Toán Tài Sản</h2>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thAsset}>Tài sản</th>
              <th className={styles.thLegal}>Thông tin pháp nhân</th>
              <th className={styles.thPayment}>Thanh toán</th>
              <th className={styles.thQr}>Mã QR</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(function (group: IPaymentGroupData): React.ReactElement {
              const hasBankInfo: boolean = !!(group.bankAccountNumber);
              const hasQr: boolean = !!(group.qrImageUrl);
              const rowSpanCount: number = group.items.length;

              return (
                <React.Fragment key={group.legalEntity}>
                  {group.items.map(function (item: IOrderItem, itemIndex: number): React.ReactElement {
                    return (
                      <tr key={item.id}>
                        {/* Cột Tài sản - mỗi hàng */}
                        <td className={styles.tdAsset}>
                          <div className={styles.assetCell}>
                            <div className={styles.thumbnailWrap}>
                              <img
                                className={styles.thumbnail}
                                src={item.imageUrl}
                                alt={item.assetName}
                              />
                            </div>
                            <div className={styles.assetInfo}>
                              <div className={styles.assetName}>{item.assetName}</div>
                              <div className={styles.assetMeta}>Mã TS: <strong>{item.assetCode}</strong></div>
                              <div className={styles.assetMeta}>Tình trạng: {item.condition}</div>
                              <div className={styles.assetMeta}>Site: {item.site}</div>
                              <div className={styles.assetQty}>× {item.quantity}</div>
                            </div>
                          </div>
                        </td>

                        {/* Cột Thông tin pháp nhân - chỉ render ở hàng đầu, dùng rowSpan */}
                        {itemIndex === 0 && (
                          <td className={styles.tdLegal} rowSpan={rowSpanCount}>
                            {hasBankInfo ? (
                              <div className={styles.legalCell}>
                                <div className={styles.accountRow}>
                                  <span className={styles.accountLabel}>Tên TK:</span>
                                  <strong className={styles.accountValue}>{group.bankAccountName}</strong>
                                </div>
                                <div className={styles.accountRow}>
                                  <span className={styles.accountLabel}>Số TK:</span>
                                  <strong className={styles.accountNumber}>{group.bankAccountNumber}</strong>
                                </div>
                              </div>
                            ) : (
                              <div className={styles.adminError}>
                                <FiAlertTriangle className={styles.adminErrorIcon} aria-hidden="true" />
                                <span className={styles.adminErrorTitle}>Chưa có thông tin thanh toán</span>
                                <span className={styles.adminErrorMsg}>Vui lòng liên hệ admin để cấu hình tài khoản cho pháp nhân <strong>{group.legalEntity || 'này'}</strong>.</span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Cột Thanh toán - từng sản phẩm */}
                        <td className={styles.tdPayment}>
                          <div className={styles.paymentCell}>
                            <div className={styles.paymentAmount}>{formatCurrency(item.amount)}</div>
                          </div>
                        </td>

                        {/* Cột Mã QR - chỉ render ở hàng đầu, dùng rowSpan */}
                        {itemIndex === 0 && (
                          <td className={styles.tdQr} rowSpan={rowSpanCount}>
                            <div className={styles.qrCell}>
                              {hasQr ? (
                                <img
                                  className={styles.qrImage}
                                  src={group.qrImageUrl}
                                  alt={'QR ' + (group.legalEntity || 'thanh toán')}
                                />
                              ) : (
                                <div className={styles.qrAdminError}>
                                  <FiLock className={styles.qrAdminErrorIcon} aria-hidden="true" />
                                  <span className={styles.qrAdminErrorMsg}>Không thể tạo mã QR</span>
                                  <span className={styles.qrAdminErrorSub}>Vui lòng liên hệ admin</span>
                                </div>
                              )}
                              {hasQr && <VietQrBadge />}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Hàng tổng nhóm */}
                  <tr className={styles.groupTotalRow}>
                    <td colSpan={2} className={styles.groupTotalLabel}>
                      Tổng thanh toán — <strong>{group.legalEntity || 'Không xác định'}</strong>
                      {group.transferContent && (
                        <span className={styles.groupTransferContent}>{group.transferContent}</span>
                      )}
                    </td>
                    <td className={styles.groupTotalAmount}>
                      {formatCurrency(group.groupTotal)}
                    </td>
                    <td />
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
