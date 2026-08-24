export interface IEmailProduct {
  productName: string;
  variant: string;
  quantity: number;
  price: number;
}

export interface IEmailOrder {
  orderCode: string;
  orderDateTime: string;
  totalAmount: number;
}

export interface ISendEmailOptions {
  recipient: string;
  type: string;
  order: IEmailOrder;
  products: IEmailProduct[];
}

function formatEmailOrderDateTime(value: string): string {
  const parsedDate: Date = new Date(value);

  if (isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(parsedDate);
}

export async function sendEmail(webhookUrl: string, options: ISendEmailOptions): Promise<void> {
  const normalizedWebhookUrl: string = (webhookUrl || '').trim();

  if (!normalizedWebhookUrl) {
    // eslint-disable-next-line no-console
    console.warn('Bỏ qua gửi email: chưa cấu hình Power Automate Email Webhook URL.');
    return;
  }

  const payload: ISendEmailOptions = {
    ...options,
    order: {
      ...options.order,
      orderDateTime: formatEmailOrderDateTime(options.order.orderDateTime)
    }
  };

  const response = await fetch(normalizedWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to send email via Power Automate: ' + String(response.status));
  }
}
