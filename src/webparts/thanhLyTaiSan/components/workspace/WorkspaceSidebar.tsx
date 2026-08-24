import * as React from 'react';
import logoMag from '../../assets/logoMAG.png';
import type { TWorkspaceTab } from './useWorkspaceData';
import styles from '../OrderWorkspace.module.scss';

type TMenuIcon = 'register' | 'cart' | 'orders' | 'admin' | 'assets';

export interface IWorkspaceSidebarProps {
  activeTab: TWorkspaceTab;
  isSidebarCollapsed: boolean;
  hasAdminRole: boolean;
  ordersCount: number;
  adminOrdersCount: number;
  onToggleCollapse: () => void;
  onSelectTab: (tab: TWorkspaceTab) => void;
  onShowOrderList: () => void;
  onShowAdminList: () => void;
  onShowAdminAssetList: () => void;
}

function renderMenuIcon(icon: TMenuIcon): React.ReactElement {
  if (icon === 'register') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.75h7.5l3.75 3.75V19A1.25 1.25 0 0 1 17 20.25H7A1.25 1.25 0 0 1 5.75 19V6A1.25 1.25 0 0 1 7 4.75Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14.5 4.75V8.5h3.75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 12h6.5M8.5 15.5h6.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'cart') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 6.25h1.8l1.4 7.15a1 1 0 0 0 .98.8h7.88a1 1 0 0 0 .97-.76l1.18-5.19H7.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="17.75" r="1.25" fill="currentColor" />
        <circle cx="16" cy="17.75" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  if (icon === 'orders') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.25" y="4.75" width="13.5" height="14.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.5 9h7M8.5 12h7M8.5 15h4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'assets') {
    return (
      <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 7.5h15v11a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 18.5v-11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 12h6M9 15h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={styles.menuIconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.75 6.5 6v5.1c0 3.58 2.29 6.84 5.5 7.9 3.21-1.06 5.5-4.32 5.5-7.9V6L12 3.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 11.75 11 13.25l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkspaceSidebar(props: IWorkspaceSidebarProps): React.ReactElement {
  return (
    <aside className={styles.sidebar + ' ' + (props.isSidebarCollapsed ? styles.sidebarCollapsed : '')}>
      <div className={styles.sidebarHeader}>
        {!props.isSidebarCollapsed && (
          <div className={styles.brandBlock}>
            <img className={styles.brandLogo} src={logoMag} alt="Logo MAG" />
            <strong className={styles.brandTitle}>Mua tài sản nội bộ</strong>
          </div>
        )}

        <button
          type="button"
          className={styles.collapseButton}
          onClick={props.onToggleCollapse}
          aria-label={props.isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          title={props.isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {props.isSidebarCollapsed ? '>' : '<'}
        </button>
      </div>

      <nav className={styles.menuList} aria-label="Điều hướng chức năng">
        <button
          type="button"
          className={
            styles.menuButton +
            ' ' +
            (props.activeTab === 'register' ? styles.menuButtonActive : '') +
            ' ' +
            (props.isSidebarCollapsed ? styles.menuButtonCollapsed : '')
          }
          onClick={(): void => {
            props.onSelectTab('register');
          }}
          aria-label="Đăng ký mua tài sản"
          title="Đăng ký mua tài sản"
        >
          <span className={styles.menuIcon} aria-hidden="true">
            {renderMenuIcon('register')}
          </span>
          {!props.isSidebarCollapsed && (
            <span className={styles.menuText}>
              <span className={styles.menuLabel}>Đăng ký mua</span>
              <span className={styles.menuHint}>Tìm và đăng ký tài sản thanh lý</span>
            </span>
          )}
        </button>

        <button
          type="button"
          className={
            styles.menuButton +
            ' ' +
            (props.activeTab === 'cart' ? styles.menuButtonActive : '') +
            ' ' +
            (props.isSidebarCollapsed ? styles.menuButtonCollapsed : '')
          }
          onClick={(): void => {
            props.onSelectTab('cart');
          }}
          aria-label="Giỏ hàng"
          title="Giỏ hàng"
        >
          <span className={styles.menuIcon} aria-hidden="true">
            {renderMenuIcon('cart')}
          </span>
          {!props.isSidebarCollapsed && (
            <span className={styles.menuText}>
              <span className={styles.menuLabel}>Giỏ hàng</span>
              <span className={styles.menuHint}>Quản lý các sản phẩm đã thêm vào giỏ</span>
            </span>
          )}
        </button>

        <button
          type="button"
          className={
            styles.menuButton +
            ' ' +
            (props.activeTab === 'orders' ? styles.menuButtonActive : '') +
            ' ' +
            (props.isSidebarCollapsed ? styles.menuButtonCollapsed : '')
          }
          onClick={props.onShowOrderList}
          aria-label={'Danh sách giao dịch ' + String(props.ordersCount)}
          title={'Danh sách giao dịch (' + String(props.ordersCount) + ')'}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            {renderMenuIcon('orders')}
          </span>
          {!props.isSidebarCollapsed && (
            <span className={styles.menuText}>
              <span className={styles.menuLabel}>Danh sách giao dịch</span>
              <span className={styles.menuHint}>Tất cả giao dịch của bạn ({props.ordersCount})</span>
            </span>
          )}
        </button>

        {props.hasAdminRole && (
          <button
            type="button"
            className={
              styles.menuButton +
              ' ' +
              (props.activeTab === 'assets' ? styles.menuButtonActive : '') +
              ' ' +
              (props.isSidebarCollapsed ? styles.menuButtonCollapsed : '')
            }
            onClick={props.onShowAdminAssetList}
            aria-label="Quản lý tài sản"
            title="Quản lý tài sản"
          >
            <span className={styles.menuIcon} aria-hidden="true">
              {renderMenuIcon('assets')}
            </span>
            {!props.isSidebarCollapsed && (
              <span className={styles.menuText}>
                <span className={styles.menuLabel}>Quản lý tài sản</span>
                <span className={styles.menuHint}>Giám sát tồn kho và đối soát dữ liệu</span>
              </span>
            )}
          </button>
        )}

        {props.hasAdminRole && (
          <button
            type="button"
            className={
              styles.menuButton +
              ' ' +
              (props.activeTab === 'admin' ? styles.menuButtonActive : '') +
              ' ' +
              (props.isSidebarCollapsed ? styles.menuButtonCollapsed : '')
            }
            onClick={props.onShowAdminList}
            aria-label={'Quản lý giao dịch admin ' + String(props.adminOrdersCount)}
            title={'Quản lý giao dịch admin (' + String(props.adminOrdersCount) + ')'}
          >
            <span className={styles.menuIcon} aria-hidden="true">
              {renderMenuIcon('admin')}
            </span>
            {!props.isSidebarCollapsed && (
              <span className={styles.menuText}>
                <span className={styles.menuLabel}>Quản lý giao dịch</span>
                <span className={styles.menuHint}>Theo dõi tất cả đơn hàng ({props.adminOrdersCount})</span>
              </span>
            )}
          </button>
        )}
      </nav>
    </aside>
  );
}
