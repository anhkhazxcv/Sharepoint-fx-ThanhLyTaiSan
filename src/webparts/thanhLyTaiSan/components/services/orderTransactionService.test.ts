jest.mock('@microsoft/sp-http', () => ({
  SPHttpClient: {
    configurations: {
      v1: {}
    }
  }
}));

import type { SPHttpClient } from '@microsoft/sp-http';
import { getTransactionsByUser } from './orderTransactionService';

type TMockResponse = {
  ok: boolean;
  json: jest.Mock<Promise<unknown>, []>;
  text: jest.Mock<Promise<string>, []>;
};

function createJsonResponse(value: unknown): TMockResponse {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue(value),
    text: jest.fn().mockResolvedValue('')
  };
}

describe('orderTransactionService.getTransactionsByUser', () => {
  it('requests Created as a fallback field and maps detail rows', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          value: [
            {
              OrderId: 'ORD-001',
              EmployeeName: 'Nguyen Van A',
              EmployeeEmail: 'user@example.com',
              Created: '2026-03-30T10:00:00.000Z',
              TotalQuantity: 2,
              TotalAmount: 3000000,
              Status: 'Chưa bàn giao',
              PaymentStatus: 'Chờ xác nhận'
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          value: [
            {
              OrderId: 'ORD-001',
              ProductCode: 'TS001',
              Quantity: 2,
              UnitPrice: 1500000,
              LineTotal: 3000000
            }
          ]
        })
      );
    const spHttpClient = ({
      get
    } as unknown) as SPHttpClient;

    const transactions = await getTransactionsByUser(
      'https://contoso.sharepoint.com/sites/assets',
      spHttpClient,
      'user@example.com'
    );

    expect(get.mock.calls[0][0]).toContain('$select=OrderId,EmployeeName,EmployeeEmail,OrderDate,Created,TotalQuantity,TotalAmount,Status,PaymentStatus,Id');
    expect(transactions).toHaveLength(1);
    expect(transactions[0].purchaseDate).toBe('2026-03-30T10:00:00.000Z');
    expect(transactions[0].items).toEqual([
      {
        productCode: 'TS001',
        legalEntity: '',
        quantity: 2,
        unitPrice: 1500000,
        lineTotal: 3000000
      }
    ]);
  });
});
