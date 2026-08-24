export type TOrderBadgeClassKey = 'badgeSuccess' | 'badgeWarning' | 'badgeNeutral';

export function getPaymentBadgeClass(status: string): TOrderBadgeClassKey {
  if (status === 'Đã thanh toán') {
    return 'badgeSuccess';
  }

  return 'badgeWarning';
}

export function getHandoverBadgeClass(status: string): TOrderBadgeClassKey {
  if (status === 'Đã bàn giao') {
    return 'badgeSuccess';
  }

  return 'badgeNeutral';
}
