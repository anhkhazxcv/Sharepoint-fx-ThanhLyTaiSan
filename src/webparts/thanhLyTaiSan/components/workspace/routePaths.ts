export const ROUTE_PATHS = {
  register: '/dang-ky',
  cart: '/gio-hang',
  orders: '/don-hang',
  orderDetailPattern: '/don-hang/:orderId',
  orderDetail: (orderId: string): string => '/don-hang/' + orderId,
  adminAssets: '/quan-ly-tai-san',
  admin: '/quan-ly-giao-dich',
  adminOrderDetailPattern: '/quan-ly-giao-dich/:orderId',
  adminOrderDetail: (orderId: string): string => '/quan-ly-giao-dich/' + orderId
} as const;
