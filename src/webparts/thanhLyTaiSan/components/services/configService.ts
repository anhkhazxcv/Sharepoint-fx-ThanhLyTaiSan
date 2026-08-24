import { SPHttpClient } from '@microsoft/sp-http';
import {
  escapeODataValue,
  getListItemByFilter,
  getListItems,
  getNumberValue,
  getStringValue,
  updateListItemById,
  type TSharePointItem
} from './sharePointListUtils';

import { LST_CONFIG } from '../constants/sharePointLists';

const DEFAULT_MAX_ORDER: number = 10;
const START_ORDER_CONFIG_KEY: string = 'StartOrder';
const STOP_SELLING_CONFIG_KEY: string = 'StopSelling';
const BLACKLIST_USER_CONFIG_KEY: string = 'BlackListUser';
const CONFIG_CACHE_TTL_MS: number = 60000;

type TConfigFieldName = 'Title' | 'Label';

interface IConfigItem {
  id: number;
  value?: string;
}

interface IConfigCacheEntry {
  expiresAt: number;
  values: Record<string, string | undefined>;
}

const configCacheBySite: Record<string, IConfigCacheEntry> = {};

function getConfigCacheKey(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '').toLowerCase();
}

async function loadAllConfigValues(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<Record<string, string | undefined>> {
  const cacheKey: string = getConfigCacheKey(siteUrl);
  const cachedEntry: IConfigCacheEntry | undefined = configCacheBySite[cacheKey];
  const now: number = Date.now();

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.values;
  }

  const items: TSharePointItem[] = await getListItems(siteUrl, spHttpClient, LST_CONFIG, ['Title', 'Label', 'Value']);
  const refreshedEntry: IConfigCacheEntry | undefined = configCacheBySite[cacheKey];

  if (refreshedEntry && refreshedEntry.expiresAt > Date.now()) {
    return refreshedEntry.values;
  }

  const values: Record<string, string | undefined> = {};

  items.forEach((item: TSharePointItem): void => {
    const configValue: string | undefined = getConfigValueFromRaw(item.Value);
    const titleValue: string = getStringValue(item, ['Title']);
    const labelValue: string = getStringValue(item, ['Label']);

    if (titleValue) {
      values[titleValue] = configValue;
    }

    if (labelValue) {
      values[labelValue] = configValue;
    }
  });

  configCacheBySite[cacheKey] = {
    expiresAt: now + CONFIG_CACHE_TTL_MS,
    values
  };

  return values;
}

export function invalidateConfigCache(siteUrl: string): void {
  delete configCacheBySite[getConfigCacheKey(siteUrl)];
}

function getConfigValueFromRaw(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim();
  }

  if (typeof raw === 'boolean') {
    return raw ? 'true' : 'false';
  }

  if (typeof raw === 'number') {
    return String(raw);
  }

  return undefined;
}

async function getConfigItemByField(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  fieldName: TConfigFieldName,
  label: string
): Promise<IConfigItem | undefined> {
  const firstItem: TSharePointItem | undefined = await getListItemByFilter(
    siteUrl,
    spHttpClient,
    LST_CONFIG,
    fieldName + " eq '" + escapeODataValue(label) + "'",
    ['Id', 'Value']
  );

  if (!firstItem) {
    return undefined;
  }

  const itemId: number = getNumberValue(firstItem, ['Id']);

  if (!itemId) {
    return undefined;
  }

  return {
    id: itemId,
    value: getConfigValueFromRaw(firstItem.Value)
  };
}

async function getConfigItem(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  label: string
): Promise<IConfigItem | undefined> {
  // Ưu tiên đọc theo Title và fallback về Label để tương thích dữ liệu cấu hình hiện có.
  const byTitle: IConfigItem | undefined = await getConfigItemByField(siteUrl, spHttpClient, 'Title', label);

  if (byTitle) {
    return byTitle;
  }

  return getConfigItemByField(siteUrl, spHttpClient, 'Label', label);
}

export async function getConfigValue(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  label: string
): Promise<string | undefined> {
  const values: Record<string, string | undefined> = await loadAllConfigValues(siteUrl, spHttpClient);
  return values[label];
}

function parseBooleanConfigValue(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) {
    return defaultValue;
  }

  const normalizedValue: string = raw.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'no') {
    return false;
  }

  return defaultValue;
}

async function updateConfigItemValue(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  itemId: number,
  value: string
): Promise<void> {
  await updateListItemById(siteUrl, spHttpClient, LST_CONFIG, itemId, {
    Value: value
  });
}

export async function getMaxOrderConfig(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<number> {
  const raw: string | undefined = await getConfigValue(siteUrl, spHttpClient, 'MaxOrder');

  if (raw === undefined) {
    return DEFAULT_MAX_ORDER;
  }

  const parsed: number = parseInt(raw, 10);

  return isNaN(parsed) || parsed <= 0 ? DEFAULT_MAX_ORDER : parsed;
}

export async function getStartOrderConfig(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<boolean> {
  const raw: string | undefined = await getConfigValue(siteUrl, spHttpClient, START_ORDER_CONFIG_KEY);
  return parseBooleanConfigValue(raw, false);
}

export async function getStopSellingConfig(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<boolean> {
  const raw: string | undefined = await getConfigValue(siteUrl, spHttpClient, STOP_SELLING_CONFIG_KEY);
  return parseBooleanConfigValue(raw, false);
}

export function isUserInBlacklistValue(blacklistValue: string | undefined, userEmail: string): boolean {
  if (!blacklistValue || !userEmail.trim()) {
    return false;
  }

  return blacklistValue.indexOf(userEmail.trim()) >= 0;
}

export async function isUserBlacklisted(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  userEmail: string
): Promise<boolean> {
  const raw: string | undefined = await getConfigValue(siteUrl, spHttpClient, BLACKLIST_USER_CONFIG_KEY);
  return isUserInBlacklistValue(raw, userEmail);
}

export async function updateStartOrderConfig(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  isStarted: boolean
): Promise<void> {
  const configItem: IConfigItem | undefined = await getConfigItem(siteUrl, spHttpClient, START_ORDER_CONFIG_KEY);

  if (!configItem) {
    throw new Error('Không tìm thấy cấu hình StartOrder trong SharePoint list ' + LST_CONFIG + '.');
  }

  await updateConfigItemValue(siteUrl, spHttpClient, configItem.id, isStarted ? 'true' : 'false');
  invalidateConfigCache(siteUrl);
}
