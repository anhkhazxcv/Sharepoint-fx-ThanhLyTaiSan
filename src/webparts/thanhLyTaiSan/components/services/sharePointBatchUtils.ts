import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import type { IAssetImportOperation } from './assetImportUtils';
import { chunkArray, runWithConcurrency } from './batchConcurrencyUtils';

export { chunkArray, runWithConcurrency } from './batchConcurrencyUtils';

export const SHARE_POINT_BATCH_SIZE: number = 100;
export const SHARE_POINT_PARALLEL_BATCH_LIMIT: number = 5;

export interface ISharePointBatchResult {
  successCount: number;
  failedCount: number;
  errors: string[];
  operationSuccess: boolean[];
  statusCodes: number[];
}

function createBatchBoundary(): string {
  return 'batch_' + Math.random().toString(36).slice(2);
}

function buildBatchRequestBody(
  siteUrl: string,
  listTitle: string,
  operations: IAssetImportOperation[],
  boundary: string
): string {
  const baseUrl: string = siteUrl.replace(/\/$/, '');
  const listPath: string = "/_api/web/lists/getbytitle('" + encodeURIComponent(listTitle) + "')/items";
  const parts: string[] = [];

  operations.forEach((operation: IAssetImportOperation): void => {
    if (operation.type === 'insert') {
      parts.push(
        '--' +
          boundary +
          '\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST ' +
          baseUrl +
          listPath +
          ' HTTP/1.1\r\nContent-Type: application/json;odata.metadata=none\r\nAccept: application/json;odata.metadata=none\r\n\r\n' +
          JSON.stringify(operation.payload) +
          '\r\n'
      );
      return;
    }

    parts.push(
      '--' +
        boundary +
        '\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPATCH ' +
        baseUrl +
        listPath +
        '(' +
        String(operation.itemId) +
        ') HTTP/1.1\r\nContent-Type: application/json;odata.metadata=none\r\nAccept: application/json;odata.metadata=none\r\nIf-Match: ' +
        (operation.etag || '*') +
        '\r\n\r\n' +
        JSON.stringify(operation.payload) +
        '\r\n'
    );
  });

  parts.push('--' + boundary + '--\r\n');
  return parts.join('');
}

function parseBatchResponseBody(responseText: string, operationCount: number): ISharePointBatchResult {
  const statusMatches: RegExpMatchArray | null = responseText.match(/HTTP\/1\.1\s+(\d{3})/g);
  const statuses: number[] = statusMatches
    ? statusMatches.map((match: string) => Number(match.replace(/HTTP\/1\.1\s+/, '')))
    : [];
  let successCount: number = 0;
  let failedCount: number = 0;
  const errors: string[] = [];
  const operationSuccess: boolean[] = [];

  for (let index: number = 0; index < operationCount; index += 1) {
    const statusCode: number = statuses[index] || 0;
    const isSuccess: boolean = statusCode >= 200 && statusCode < 300;

    operationSuccess.push(isSuccess);

    if (isSuccess) {
      successCount += 1;
      continue;
    }

    failedCount += 1;

    if (errors.length < 5) {
      errors.push('Thao tác ' + String(index + 1) + ' thất bại (HTTP ' + String(statusCode) + ').');
    }
  }

  if (!statuses.length && operationCount > 0) {
    failedCount = operationCount;
    errors.push('Không đọc được phản hồi batch từ SharePoint.');

    for (let index: number = operationSuccess.length; index < operationCount; index += 1) {
      operationSuccess.push(false);
    }
  }

  return {
    successCount,
    failedCount,
    errors,
    operationSuccess,
    statusCodes: statuses
  };
}

async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve: () => void) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export async function executeSharePointBatch(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  operations: IAssetImportOperation[]
): Promise<ISharePointBatchResult> {
  if (!operations.length) {
    return {
      successCount: 0,
      failedCount: 0,
      errors: [],
      operationSuccess: [],
      statusCodes: []
    };
  }

  const boundary: string = createBatchBoundary();
  const requestBody: string = buildBatchRequestBody(siteUrl, listTitle, operations, boundary);
  const requestUrl: string = siteUrl.replace(/\/$/, '') + '/_api/$batch';

  const sendBatch = async (): Promise<SPHttpClientResponse> => {
    return spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        Accept: 'application/json;odata.metadata=none',
        'Content-Type': 'multipart/mixed; boundary=' + boundary
      },
      body: requestBody
    });
  };

  const sendBatchWithRetry = async (): Promise<SPHttpClientResponse> => {
    const initialResponse: SPHttpClientResponse = await sendBatch();

    if (initialResponse.status !== 429) {
      return initialResponse;
    }

    const retryAfterHeader: string | null = initialResponse.headers.get('Retry-After');
    const retryAfterSeconds: number = retryAfterHeader ? Number(retryAfterHeader) : 3;
    await sleep(Math.max(retryAfterSeconds, 2) * 1000);
    return sendBatch();
  };

  const response: SPHttpClientResponse = await sendBatchWithRetry();

  const responseText: string = await response.text();

  if (!response.ok) {
    return {
      successCount: 0,
      failedCount: operations.length,
      errors: ['Batch request thất bại (HTTP ' + String(response.status) + ').'],
      operationSuccess: operations.map(() => false),
      statusCodes: operations.map(() => response.status)
    };
  }

  return parseBatchResponseBody(responseText, operations.length);
}

export async function executeImportBatches(
  siteUrl: string,
  spHttpClient: SPHttpClient,
  listTitle: string,
  operations: IAssetImportOperation[],
  onProgress?: (completedBatches: number, totalBatches: number) => void
): Promise<ISharePointBatchResult> {
  const batches: IAssetImportOperation[][] = chunkArray(operations, SHARE_POINT_BATCH_SIZE);
  const totalBatches: number = batches.length;
  let completedBatches: number = 0;
  let successCount: number = 0;
  let failedCount: number = 0;
  const errors: string[] = [];
  const operationSuccess: boolean[] = [];
  const statusCodes: number[] = [];

  const runBatch = async (batchOperations: IAssetImportOperation[]): Promise<ISharePointBatchResult> => {
    const result: ISharePointBatchResult = await executeSharePointBatch(siteUrl, spHttpClient, listTitle, batchOperations);
    completedBatches += 1;

    if (onProgress) {
      onProgress(completedBatches, totalBatches);
    }

    return result;
  };

  if (totalBatches <= SHARE_POINT_PARALLEL_BATCH_LIMIT) {
    const batchResults: ISharePointBatchResult[] = await Promise.all(batches.map((batch) => runBatch(batch)));

    batchResults.forEach((result: ISharePointBatchResult) => {
      successCount += result.successCount;
      failedCount += result.failedCount;
      errors.push(...result.errors);
      operationSuccess.push(...result.operationSuccess);
      statusCodes.push(...result.statusCodes);
    });
  } else {
    const batchResults: ISharePointBatchResult[] = await runWithConcurrency(
      batches,
      SHARE_POINT_PARALLEL_BATCH_LIMIT,
      (batch: IAssetImportOperation[]) => runBatch(batch)
    );

    batchResults.forEach((result: ISharePointBatchResult) => {
      successCount += result.successCount;
      failedCount += result.failedCount;
      errors.push(...result.errors);
      operationSuccess.push(...result.operationSuccess);
      statusCodes.push(...result.statusCodes);
    });
  }

  return {
    successCount,
    failedCount,
    errors: errors.slice(0, 5),
    operationSuccess,
    statusCodes
  };
}
