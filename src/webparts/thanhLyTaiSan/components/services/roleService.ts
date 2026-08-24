import { SPHttpClient } from '@microsoft/sp-http';
import { escapeODataValue, getListItems, getStringValue, type TSharePointItem } from './sharePointListUtils';

import { LST_ROLE } from '../constants/sharePointLists';

export async function isUserAdmin(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<boolean> {
  if (!userEmail) {
    return false;
  }

  const normalizedEmail: string = userEmail.trim().toLowerCase();
  const items: TSharePointItem[] = await getListItems(
    siteUrl,
    spHttpClient,
    LST_ROLE,
    ['Role', 'EmailUser'],
    "EmailUser eq '" + escapeODataValue(normalizedEmail) + "'"
  );

  if (!items.length) {
    return false;
  }

  return getStringValue(items[0], ['Role']).toLowerCase() === 'admin';
}
