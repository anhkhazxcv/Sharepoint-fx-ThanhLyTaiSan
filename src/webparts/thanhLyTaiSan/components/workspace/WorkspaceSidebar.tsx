import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { FiBox, FiChevronLeft, FiChevronRight, FiFileText, FiList, FiShield, FiShoppingCart } from 'react-icons/fi';
import logoMag from '../../assets/logoMAG.png';
import { ROUTE_PATHS } from './routePaths';
import styles from '../OrderWorkspace.module.scss';

export interface IWorkspaceSidebarProps {
  isSidebarCollapsed: boolean;
  hasAdminRole: boolean;
  ordersCount: number;
  adminOrdersCount: number;
  userDisplayName: string;
  userEmail: string;
  userPhotoUrl?: string;
  onToggleCollapse: () => void;
}

interface IMenuCountBadgeProps {
  count: number;
  isSidebarCollapsed: boolean;
}

function MenuCountBadge(props: IMenuCountBadgeProps): React.ReactElement {
  if (!props.count) {
    return <></>;
  }

  if (props.isSidebarCollapsed) {
    return <span className={styles.menuBadge}>{props.count}</span>;
  }

  return <span className={styles.menuCount}>{props.count}</span>;
}

export function WorkspaceSidebar(props: IWorkspaceSidebarProps): React.ReactElement {
  function menuButtonClassName(isActive: boolean): string {
    return (
      styles.menuButton +
      ' ' +
      (isActive ? styles.menuButtonActive : '') +
      ' ' +
      (props.isSidebarCollapsed ? styles.menuButtonCollapsed : '')
    );
  }

  const displayName: string = props.userDisplayName || 'Người dùng nội bộ';
  const avatarInitial: string = displayName.charAt(0).toUpperCase();
  const [photoFailed, setPhotoFailed] = React.useState(false);

  return (
    <aside className={styles.sidebar + ' ' + (props.isSidebarCollapsed ? styles.sidebarCollapsed : '')}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brandBlock}>
          <img className={styles.brandLogo} src={logoMag} alt="Logo MAG" />
          {!props.isSidebarCollapsed && (
            <div className={styles.brandText}>
              <strong className={styles.brandTitle}>Mua tài sản nội bộ</strong>
              <span className={styles.brandSubtitle}>Masterise Group</span>
            </div>
          )}
        </div>
      </div>

      <nav className={styles.menuList} aria-label="Điều hướng chức năng">
        {!props.isSidebarCollapsed && <div className={styles.menuSectionLabel}>Giao dịch</div>}

        <NavLink
          to={ROUTE_PATHS.register}
          end
          className={({ isActive }): string => menuButtonClassName(isActive)}
          aria-label="Đăng ký mua tài sản"
          title="Đăng ký mua tài sản"
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <FiFileText className={styles.menuIconSvg} size={18} />
          </span>
          {!props.isSidebarCollapsed && (
            <span className={styles.menuText}>
              <span className={styles.menuLabel}>Đăng ký mua</span>
            </span>
          )}
        </NavLink>

        <NavLink
          to={ROUTE_PATHS.cart}
          end
          className={({ isActive }): string => menuButtonClassName(isActive)}
          aria-label="Giỏ hàng"
          title="Giỏ hàng"
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <FiShoppingCart className={styles.menuIconSvg} size={18} />
          </span>
          {!props.isSidebarCollapsed && (
            <span className={styles.menuText}>
              <span className={styles.menuLabel}>Giỏ hàng</span>
            </span>
          )}
        </NavLink>

        <NavLink
          to={ROUTE_PATHS.orders}
          className={({ isActive }): string => menuButtonClassName(isActive)}
          aria-label={'Danh sách giao dịch ' + String(props.ordersCount)}
          title={'Danh sách giao dịch (' + String(props.ordersCount) + ')'}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <FiList className={styles.menuIconSvg} size={18} />
            {props.isSidebarCollapsed && (
              <MenuCountBadge count={props.ordersCount} isSidebarCollapsed={props.isSidebarCollapsed} />
            )}
          </span>
          {!props.isSidebarCollapsed && (
            <span className={styles.menuText}>
              <span className={styles.menuLabel}>Danh sách giao dịch</span>
              <MenuCountBadge count={props.ordersCount} isSidebarCollapsed={props.isSidebarCollapsed} />
            </span>
          )}
        </NavLink>

        {props.hasAdminRole && (
          <>
            {!props.isSidebarCollapsed && <hr className={styles.menuSectionDivider} />}
            {!props.isSidebarCollapsed && <div className={styles.menuSectionLabel}>Quản trị</div>}

            <NavLink
              to={ROUTE_PATHS.adminAssets}
              className={({ isActive }): string => menuButtonClassName(isActive)}
              aria-label="Quản lý tài sản"
              title="Quản lý tài sản"
            >
              <span className={styles.menuIcon} aria-hidden="true">
                <FiBox className={styles.menuIconSvg} size={18} />
              </span>
              {!props.isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Quản lý tài sản</span>
                </span>
              )}
            </NavLink>

            <NavLink
              to={ROUTE_PATHS.admin}
              className={({ isActive }): string => menuButtonClassName(isActive)}
              aria-label={'Quản lý giao dịch admin ' + String(props.adminOrdersCount)}
              title={'Quản lý giao dịch admin (' + String(props.adminOrdersCount) + ')'}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                <FiShield className={styles.menuIconSvg} size={18} />
                {props.isSidebarCollapsed && (
                  <MenuCountBadge count={props.adminOrdersCount} isSidebarCollapsed={props.isSidebarCollapsed} />
                )}
              </span>
              {!props.isSidebarCollapsed && (
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Quản lý giao dịch</span>
                  <MenuCountBadge count={props.adminOrdersCount} isSidebarCollapsed={props.isSidebarCollapsed} />
                </span>
              )}
            </NavLink>
          </>
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        <div
          className={styles.userChip + ' ' + (props.isSidebarCollapsed ? styles.userChipCollapsed : '')}
          title={displayName + ' — ' + props.userEmail}
        >
          <div className={styles.userAvatar} aria-hidden="true">
            {props.userPhotoUrl && !photoFailed ? (
              <img
                className={styles.userAvatarImg}
                src={props.userPhotoUrl}
                alt=""
                onError={(): void => setPhotoFailed(true)}
              />
            ) : (
              avatarInitial
            )}
          </div>
          {!props.isSidebarCollapsed && (
            <div className={styles.userMeta}>
              <div className={styles.userMetaName}>{displayName}</div>
              <div className={styles.userMetaEmail}>{props.userEmail}</div>
            </div>
          )}
        </div>

        <div className={styles.collapseButtonRow}>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={props.onToggleCollapse}
            aria-label={props.isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            title={props.isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {props.isSidebarCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
