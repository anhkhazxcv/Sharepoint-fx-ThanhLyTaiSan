import { SPHttpClient } from '@microsoft/sp-http';
import {
  deleteListItemById,
  escapeODataValue,
  getListItemByFilter,
  getListItems,
  getNumberValue,
  getStringValue,
  postListItem,
  updateListItemById,
  type TSharePointItem
} from './sharePointListUtils';

import { LST_CHI_TIET_GIO_HANG, LST_GIO_HANG } from '../constants/sharePointLists';

export interface ICartLineRecord {
  productCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

function createCartId(userEmail: string): string {
  return 'CART-' + userEmail.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

async function ensureCartHeader(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  buyerName: string,
  buyerEmail: string
): Promise<string> {
  const escapedEmail: string = escapeODataValue(buyerEmail);
  const existingItems: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_GIO_HANG,
    ['CartId', 'EmployeeEmail'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (existingItems.length) {
    return getStringValue(existingItems[0], ['CartId']);
  }

  const cartId: string = createCartId(buyerEmail);
  await postListItem(siteUrl, spHttpClient, LST_GIO_HANG, {
    CartId: cartId,
    EmployeeName: buyerName,
    EmployeeEmail: buyerEmail
  });

  return cartId;
}

async function getCartIdByBuyerEmail(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  buyerEmail: string
): Promise<string | undefined> {
  const escapedEmail: string = escapeODataValue(buyerEmail);
  const cartHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_GIO_HANG,
    ['CartId', 'EmployeeEmail'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (!cartHeaders.length) {
    return undefined;
  }

  return getStringValue(cartHeaders[0], ['CartId']);
}

export async function getCartItemsByUser(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<ICartLineRecord[]> {
  const escapedEmail: string = escapeODataValue(userEmail);
  const cartHeaders: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_GIO_HANG,
    ['CartId', 'EmployeeEmail'],
    "EmployeeEmail eq '" + escapedEmail + "'"
  );

  if (!cartHeaders.length) {
    return [];
  }

  const cartId: string = getStringValue(cartHeaders[0], ['CartId']);
  const detailItems: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_CHI_TIET_GIO_HANG,
    ['CartId', 'ProductCode', 'Quantity', 'UnitPrice', 'LineTotal'],
    "CartId eq '" + escapeODataValue(cartId) + "'"
  );

  return detailItems.map((item: TSharePointItem): ICartLineRecord => ({
    productCode: getStringValue(item, ['ProductCode']),
    quantity: getNumberValue(item, ['Quantity'], 0),
    unitPrice: getNumberValue(item, ['UnitPrice'], 0),
    lineTotal: getNumberValue(item, ['LineTotal'], 0)
  }));
}

export async function upsertCartItem(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerName: string;
  buyerEmail: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
}): Promise<void> {
  const cartId: string = await ensureCartHeader(options.siteUrl, options.spHttpClient, options.buyerName, options.buyerEmail);
  const filterQuery: string =
    "CartId eq '" +
    escapeODataValue(cartId) +
    "' and ProductCode eq '" +
    escapeODataValue(options.productCode) +
    "'";
  const existingItem = await getListItemByFilter(options.siteUrl, options.spHttpClient, LST_CHI_TIET_GIO_HANG, filterQuery);
  const payload = {
    CartId: cartId,
    ProductCode: options.productCode,
    Quantity: options.quantity,
    UnitPrice: options.unitPrice,
    LineTotal: options.quantity * options.unitPrice
  };

  if (existingItem) {
    await updateListItemById(
      options.siteUrl,
      options.spHttpClient,
      LST_CHI_TIET_GIO_HANG,
      getNumberValue(existingItem, ['Id']),
      payload
    );
    return;
  }

  await postListItem(options.siteUrl, options.spHttpClient, LST_CHI_TIET_GIO_HANG, payload);
}

export async function removeCartItem(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerEmail: string;
  productCode: string;
}): Promise<void> {
  const cartId: string | undefined = await getCartIdByBuyerEmail(options.siteUrl, options.spHttpClient, options.buyerEmail);

  if (!cartId) {
    return;
  }

  const existingItem = await getListItemByFilter(
    options.siteUrl,
    options.spHttpClient,
    LST_CHI_TIET_GIO_HANG,
    "CartId eq '" + escapeODataValue(cartId) + "' and ProductCode eq '" + escapeODataValue(options.productCode) + "'"
  );

  if (!existingItem) {
    return;
  }

  await deleteListItemById(
    options.siteUrl,
    options.spHttpClient,
    LST_CHI_TIET_GIO_HANG,
    getNumberValue(existingItem, ['Id'])
  );
}

export async function clearCartItems(options: {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  buyerEmail: string;
  productCodes: string[];
}): Promise<void> {
  await Promise.all(
    options.productCodes.map((productCode: string) =>
      removeCartItem({
        siteUrl: options.siteUrl,
        spHttpClient: options.spHttpClient,
        buyerEmail: options.buyerEmail,
        productCode
      })
    )
  );
}
