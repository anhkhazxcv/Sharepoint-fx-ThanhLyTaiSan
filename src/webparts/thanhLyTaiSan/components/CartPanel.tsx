import * as React from 'react';
import type { ICartItem } from './types';
import { formatCurrency } from './utils/format';
import { AppButton, EmptyState } from './common';
import styles from './CartPanel.module.scss';

export interface ICartPanelProps {
  items: ICartItem[];
  selectedProductCodes: string[];
  maxSelectableQuantity: number;
  isCheckingOut: boolean;
  isCheckoutDisabled?: boolean;
  removingProductCodes?: string[];
  onToggleSelection: (productCode: string, checked: boolean) => void;
  onQuantityChange: (productCode: string, quantity: number) => void;
  onRemove: (productCode: string) => void;
  onCheckoutSelected: () => void;
}

export function CartPanel(props: ICartPanelProps): React.ReactElement {
  const selectedItems: ICartItem[] = props.items.filter((item: ICartItem) => props.selectedProductCodes.indexOf(item.productCode) >= 0);
  const selectedQuantity: number = selectedItems.reduce((sum: number, item: ICartItem) => sum + item.quantity, 0);
  const selectedAmount: number = selectedItems.reduce((sum: number, item: ICartItem) => sum + item.lineTotal, 0);
  const removingProductCodes: string[] = props.removingProductCodes || [];

  return (
    <section className={styles.panel}>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <div className={styles.header}>
            <div>
              <strong className={styles.title}>Danh sách sản phẩm</strong>
              <span className={styles.subtitle}>Chọn sản phẩm, cập nhật số lượng hoặc xóa khỏi giỏ trước khi tạo đơn.</span>
            </div>
            <div className={styles.summary}>
              <span>{props.items.length} sản phẩm</span>
            </div>
          </div>

          {!props.items.length ? (
            <EmptyState
              title="Chưa có sản phẩm nào trong giỏ hàng"
              description="Thêm tài sản từ màn đăng ký mua để bắt đầu tạo đơn."
            />
          ) : (
            <div className={styles.list}>
              {props.items.map((item: ICartItem) => {
                const isSelected: boolean = props.selectedProductCodes.indexOf(item.productCode) >= 0;
                const isRemoving: boolean = removingProductCodes.indexOf(item.productCode) >= 0;

                return (
                  <div key={item.productCode} className={styles.row}>
                    <label className={styles.checkboxWrap}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          props.onToggleSelection(item.productCode, event.target.checked)
                        }
                      />
                      <span />
                    </label>

                    <div className={styles.thumb} aria-hidden="true">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className={styles.thumbPlaceholder} />}
                    </div>

                    <div className={styles.itemInfo}>
                      <strong>{item.assetName}</strong>
                      <span>
                        {item.productCode} | {item.site} | {item.condition}
                      </span>
                    </div>

                    <label className={styles.quantityBox}>
                      <span>SL</span>
                      <input
                        type="number"
                        min={1}
                        max={item.maxQuantity}
                        value={item.quantity}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          props.onQuantityChange(item.productCode, Number(event.target.value || '0'))
                        }
                      />
                    </label>

                    <div className={styles.priceCol}>
                      <span>{formatCurrency(item.unitPrice)}</span>
                      <strong>{formatCurrency(item.lineTotal)}</strong>
                    </div>

                    <button type="button" className={styles.removeButton} onClick={() => props.onRemove(item.productCode)} disabled={isRemoving}>
                      Xóa
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className={styles.summaryColumn}>
          <div className={styles.summaryCard}>
            <strong className={styles.summaryTitle}>Tóm tắt đơn</strong>
            <div className={styles.summaryRow}>
              <span>Số lượng đã chọn</span>
              <strong>
                {selectedQuantity}/{props.maxSelectableQuantity}
              </strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Dòng được chọn</span>
              <strong>{selectedItems.length}</strong>
            </div>
            <div className={styles.summaryTotal}>
              <span>Tổng tạm tính</span>
              <strong>{formatCurrency(selectedAmount)}</strong>
            </div>
            <AppButton
              variant="primary"
              className={styles.checkoutButton}
              disabled={!selectedItems.length || props.isCheckingOut || !!props.isCheckoutDisabled}
              onClick={props.onCheckoutSelected}
            >
              {props.isCheckingOut ? 'Đang tạo đơn...' : 'Tạo đơn từ mục đã chọn'}
            </AppButton>
          </div>
        </aside>
      </div>
    </section>
  );
}
