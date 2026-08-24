export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string): string {
  const date: Date = new Date(value);
  const day: string = ('0' + String(date.getDate())).slice(-2);
  const month: string = ('0' + String(date.getMonth() + 1)).slice(-2);
  const year: number = date.getFullYear();

  return day + '/' + month + '/' + String(year);
}
