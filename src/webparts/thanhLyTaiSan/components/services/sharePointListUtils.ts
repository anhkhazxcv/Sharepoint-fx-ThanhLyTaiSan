import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

export type TSharePointItem = Record<string, unknown>;

export function getStringValue(item: TSharePointItem, candidates: string[], fallback: string = ''): string {
  for (let index: number = 0; index < candidates.length; index += 1) {
    const candidate: string = candidates[index];
    const value: unknown = item[candidate];

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return fallback;
}

export function getNumberValue(item: TSharePointItem, candidates: string[], fallback: number = 0): number {
  for (let index: number = 0; index < candidates.length; index += 1) {
    const candidate: string = candidates[index];
    const value: unknown = item[candidate];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsedValue: number = Number(value);

      if (!isNaN(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return fallback;
}

export function getBooleanValue(item: TSharePointItem, candidates: string[], fallback: boolean = false): boolean {
  for (let index: number = 0; index < candidates.length; index += 1) {
    const candidate: string = candidates[index];
    const value: unknown = item[candidate];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const normalizedValue: string = value.trim().toLowerCase();

      if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes') {
        return true;
      }

      if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'no') {
        return false;
      }
    }
  }

  return fallback;
}

export function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildOrFilter(fieldName: string, values: string[]): string {
  return values
    .map((value: string) => fieldName + " eq '" + escapeODataValue(value) + "'")
    .join(' or ');
}

export async function postListItem(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  payload: Record<string, unknown>
): Promise<void> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items";
  const response: SPHttpClientResponse = await spHttpClient.post(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'Content-Type': 'application/json;odata.metadata=none'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể ghi dữ liệu vào SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

export async function getListItemByFilter(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  filterQuery: string,
  selectFields: string[] = ['Id']
): Promise<TSharePointItem | undefined> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items?$top=1&$select=" +
    selectFields.join(',') +
    '&$filter=' +
    encodeURIComponent(filterQuery);
  const response: SPHttpClientResponse = await spHttpClient.get(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none'
      }
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể đọc dữ liệu từ SharePoint list ' + listTitle + '. Response: ' + errorText);
  }

  const json: { value?: TSharePointItem[] } = (await response.json()) as { value?: TSharePointItem[] };

  if (!json.value || !json.value.length) {
    return undefined;
  }

  return json.value[0];
}

export async function updateListItemById(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  itemId: number,
  payload: Record<string, unknown>
): Promise<void> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items(" +
    String(itemId) +
    ')';
  const response: SPHttpClientResponse = await spHttpClient.post(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'Content-Type': 'application/json;odata.metadata=none',
        'IF-MATCH': '*',
        'X-HTTP-Method': 'MERGE'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể cập nhật dữ liệu trong SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

export async function deleteListItemById(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  itemId: number
): Promise<void> {
  const requestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items(" +
    String(itemId) +
    ')';
  const response: SPHttpClientResponse = await spHttpClient.post(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'IF-MATCH': '*',
        'X-HTTP-Method': 'DELETE'
      }
    }
  );

  if (!response.ok) {
    const errorText: string = await response.text();
    throw new Error('Không thể xóa dữ liệu trong SharePoint list ' + listTitle + '. Response: ' + errorText);
  }
}

export async function getListItems(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  selectFields: string[],
  filterQuery?: string
): Promise<TSharePointItem[]> {
  const selectQuery: string = selectFields.length ? '&$select=' + selectFields.join(',') : '';
  const baseRequestUrl: string =
    siteUrl.replace(/\/$/, '') +
    "/_api/web/lists/getbytitle('" +
    encodeURIComponent(listTitle) +
    "')/items?$top=5000" +
    selectQuery +
    (filterQuery ? '&$filter=' + encodeURIComponent(filterQuery) : '');
  const collectedItems: TSharePointItem[] = [];
  let nextRequestUrl: string | undefined = baseRequestUrl;

  while (nextRequestUrl) {
    const response: SPHttpClientResponse = await spHttpClient.get(
      nextRequestUrl,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: 'application/json;odata.metadata=none'
        }
      }
    );

    if (!response.ok) {
      const errorText: string = await response.text();
      throw new Error('Không thể đọc dữ liệu từ SharePoint list ' + listTitle + '. Response: ' + errorText);
    }

    const json: { value?: TSharePointItem[]; '@odata.nextLink'?: string } = (await response.json()) as {
      value?: TSharePointItem[];
      '@odata.nextLink'?: string;
    };

    if (Array.isArray(json.value)) {
      collectedItems.push(...json.value);
    }

    nextRequestUrl = typeof json['@odata.nextLink'] === 'string' ? json['@odata.nextLink'] : undefined;
  }

  return collectedItems;
}
