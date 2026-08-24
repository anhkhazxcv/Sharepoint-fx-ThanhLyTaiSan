import { SPHttpClient } from '@microsoft/sp-http';
import { getListItems, getStringValue, type TSharePointItem } from './sharePointListUtils';

import { LST_THONG_TIN_NGAN_HANG } from '../constants/sharePointLists';
export const DEFAULT_QR_BANK_SLUG: string = 'techcombank';
const DEFAULT_QR_TEMPLATE: string = 'compact2';

export interface IBankInfoRecord {
  legalEntity: string;
  accountNumber: string;
}

export function buildVietQrImageUrl(
  bankSlug: string,
  accountNumber: string,
  template: string = DEFAULT_QR_TEMPLATE,
  amount?: number,
  addInfo?: string,
  accountName?: string
): string {
  if (!accountNumber) {
    return '';
  }

  const normalizedBankSlug: string = bankSlug || DEFAULT_QR_BANK_SLUG;
  const normalizedTemplate: string = template || DEFAULT_QR_TEMPLATE;
  const queryParts: string[] = [];

  if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
    queryParts.push('amount=' + encodeURIComponent(String(Math.round(amount))));
  }

  if (addInfo) {
    queryParts.push('addInfo=' + encodeURIComponent(addInfo));
  }

  if (accountName) {
    queryParts.push('accountName=' + encodeURIComponent(accountName));
  }

  return (
    'https://img.vietqr.io/image/' +
    normalizedBankSlug +
    '-' +
    accountNumber +
    '-' +
    normalizedTemplate +
    '.png' +
    (queryParts.length ? '?' + queryParts.join('&') : '')
  );
}

export async function getBankInfoFromSharePoint(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<IBankInfoRecord | undefined> {
  const items: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_THONG_TIN_NGAN_HANG,
    ['NamePeople', 'STK'],
    undefined
  );

  if (!items.length) {
    return undefined;
  }

  return {
    legalEntity: getStringValue(items[0], ['NamePeople'], ''),
    accountNumber: getStringValue(items[0], ['STK'], '')
  };
}

export async function getAllBankInfoByLegalEntity(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<Record<string, IBankInfoRecord>> {
  const items: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_THONG_TIN_NGAN_HANG,
    ['NamePeople', 'STK'],
    undefined
  );
  const result: Record<string, IBankInfoRecord> = {};

  items.forEach(function (item: TSharePointItem): void {
    const legalEntity: string = getStringValue(item, ['NamePeople'], '');
    const key: string = legalEntity;

    result[key] = {
      legalEntity,
      accountNumber: getStringValue(item, ['STK'], '')
    };
  });

  return result;
}
