jest.mock('@microsoft/sp-http', () => ({
  SPHttpClient: {
    configurations: {
      v1: {}
    }
  }
}));

import type { SPHttpClient } from '@microsoft/sp-http';
import {
  getStockReservationErrorMessage,
  isStockReservationError,
  reserveStockForOrder,
  StockReservationError,
  STOCK_CONFLICT_ERROR,
  STOCK_INSUFFICIENT_ERROR
} from './orderTransactionService';

type TMockResponse = {
  ok: boolean;
  status?: number;
  json: jest.Mock<Promise<unknown>, []>;
  text: jest.Mock<Promise<string>, []>;
};

function createJsonResponse(value: unknown, status: number = 200): TMockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(value),
    text: jest.fn().mockResolvedValue('')
  };
}

function createBatchResponse(statuses: number[]): TMockResponse {
  const body: string = statuses
    .map((status: number) => 'HTTP/1.1 ' + String(status) + ' OK\r\nContent-Type: application/json\r\n\r\n{}')
    .join('\r\n');

  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(body)
  };
}

describe('orderTransactionService.reserveStockForOrder', () => {
  it('deducts stock with etag before creating an order payload', async () => {
    const get = jest.fn().mockResolvedValueOnce(
      createJsonResponse({
        value: [
          {
            Id: 10,
            ProductCode: 'TS001',
            Stock: 5,
            '@odata.etag': '"1"'
          }
        ]
      })
    );
    const post = jest.fn().mockResolvedValueOnce(createBatchResponse([204]));
    const spHttpClient = ({
      get,
      post
    } as unknown) as SPHttpClient;

    const result = await reserveStockForOrder({
      siteUrl: 'https://contoso.sharepoint.com/sites/assets',
      spHttpClient,
      items: [{ productCode: 'TS001', quantity: 2, assetName: 'Tai san A' }]
    });

    expect(result.deductions).toEqual([
      {
        itemId: 10,
        productCode: 'TS001',
        previousStock: 5,
        deductedQuantity: 2
      }
    ]);
    expect(get.mock.calls[0][2].headers.Accept).toBe('application/json;odata.metadata=minimal');
    expect(post.mock.calls[0][0]).toContain('/_api/$batch');
    expect(post.mock.calls[0][2].body).toContain('If-Match: "1"');
    expect(post.mock.calls[0][2].body).toContain('"Stock":3');
  });

  it('fails immediately on etag conflict and rolls back prior deductions', async () => {
    const get = jest.fn().mockResolvedValueOnce(
      createJsonResponse({
        value: [
          { Id: 10, ProductCode: 'TS001', Stock: 5, '@odata.etag': '"1"' },
          { Id: 11, ProductCode: 'TS002', Stock: 3, '@odata.etag': '"2"' }
        ]
      })
    );
    const post = jest
      .fn()
      .mockResolvedValueOnce(createBatchResponse([204, 412]))
      .mockResolvedValueOnce(createJsonResponse({}));
    const spHttpClient = ({
      get,
      post
    } as unknown) as SPHttpClient;

    await expect(
      reserveStockForOrder({
        siteUrl: 'https://contoso.sharepoint.com/sites/assets',
        spHttpClient,
        items: [
          { productCode: 'TS001', quantity: 1, assetName: 'Tai san A' },
          { productCode: 'TS002', quantity: 1, assetName: 'Tai san B' }
        ]
      })
    ).rejects.toMatchObject({
      message: STOCK_CONFLICT_ERROR,
      code: 'CONFLICT'
    });

    expect(post.mock.calls).toHaveLength(2);
    expect(post.mock.calls[0][0]).toContain('/_api/$batch');
    expect(JSON.parse(post.mock.calls[1][2].body)).toEqual({ Stock: 5 });
    expect(post.mock.calls[1][2].headers['IF-MATCH']).toBe('*');
  });

  it('throws insufficient stock when quantity exceeds current stock', async () => {
    const get = jest.fn().mockResolvedValueOnce(
      createJsonResponse({
        value: [{ Id: 10, ProductCode: 'TS001', Stock: 1, '@odata.etag': '"1"' }]
      })
    );
    const post = jest.fn();
    const spHttpClient = ({
      get,
      post
    } as unknown) as SPHttpClient;

    await expect(
      reserveStockForOrder({
        siteUrl: 'https://contoso.sharepoint.com/sites/assets',
        spHttpClient,
        items: [{ productCode: 'TS001', quantity: 2, assetName: 'Tai san A' }]
      })
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT'
    });

    expect(post).not.toHaveBeenCalled();
  });
});

describe('orderTransactionService.isStockReservationError', () => {
  it('returns true for StockReservationError instance', () => {
    expect(isStockReservationError(new StockReservationError('CONFLICT'))).toBe(true);
  });

  it('returns true for plain object with conflict metadata', () => {
    expect(
      isStockReservationError({
        name: 'StockReservationError',
        code: 'CONFLICT',
        message: STOCK_CONFLICT_ERROR
      })
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isStockReservationError(new Error('other'))).toBe(false);
    expect(isStockReservationError(null)).toBe(false);
  });
});

describe('orderTransactionService.getStockReservationErrorMessage', () => {
  it('returns conflict message in Vietnamese', () => {
    expect(getStockReservationErrorMessage(new StockReservationError('CONFLICT'))).toBe(
      'Sản phẩm vừa được người khác đăng ký. Vui lòng kiểm tra lại giỏ hàng.'
    );
  });

  it('returns insufficient stock message with product names', () => {
    expect(getStockReservationErrorMessage(new StockReservationError('INSUFFICIENT', ['Tai san A']))).toBe(
      'Sản phẩm không còn đủ số lượng: Tai san A'
    );
  });

  it('returns generic insufficient stock message when product names are missing', () => {
    const error: StockReservationError = new StockReservationError('INSUFFICIENT');
    expect(error.message).toBe(STOCK_INSUFFICIENT_ERROR);
    expect(getStockReservationErrorMessage(error)).toBe('Sản phẩm không còn đủ số lượng.');
  });
});
