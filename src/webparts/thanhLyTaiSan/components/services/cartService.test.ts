jest.mock('@microsoft/sp-http', () => ({
  SPHttpClient: {
    configurations: {
      v1: {}
    }
  }
}));

import type { SPHttpClient } from '@microsoft/sp-http';
import { removeCartItem } from './cartService';

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

describe('cartService.removeCartItem', () => {
  it('uses the persisted cart id instead of recomputing it from email', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ value: [{ CartId: 'LEGACY-CART', EmployeeEmail: 'user@example.com' }] }))
      .mockResolvedValueOnce(createJsonResponse({ value: [{ Id: 99 }] }));
    const post = jest.fn().mockResolvedValue(createJsonResponse({}));
    const spHttpClient = ({
      get,
      post
    } as unknown) as SPHttpClient;

    await removeCartItem({
      siteUrl: 'https://contoso.sharepoint.com/sites/assets',
      spHttpClient,
      buyerEmail: 'user@example.com',
      productCode: 'TS001'
    });

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][0]).toContain(encodeURIComponent("CartId eq 'LEGACY-CART' and ProductCode eq 'TS001'"));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toContain("lstChiTietGioHang')/items(99)");
  });
});
