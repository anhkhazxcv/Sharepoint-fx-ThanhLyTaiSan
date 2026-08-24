import type { SPHttpClient } from '@microsoft/sp-http';
import { LST_SAN_PHAM } from '../constants/sharePointLists';
import { getListItems, getStringValue, type TSharePointItem } from './sharePointListUtils';
import {
  buildImportPlan,
  parseAssetImportWorkbook,
  type IAssetImportOperation,
  type IAssetImportPlan,
  type IAssetImportRow
} from './assetImportUtils';
import { executeImportBatches } from './sharePointBatchUtils';

export interface IAssetImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
  totalRows: number;
}

export interface IAssetImportOptions {
  siteUrl: string;
  spHttpClient: SPHttpClient;
  fileBuffer: ArrayBuffer;
  onProgress?: (completedBatches: number, totalBatches: number) => void;
}

function countImportResults(
  operations: IAssetImportOperation[],
  operationSuccess: boolean[]
): Pick<IAssetImportResult, 'inserted' | 'updated' | 'failed'> {
  let inserted: number = 0;
  let updated: number = 0;
  let failed: number = 0;

  operations.forEach((operation: IAssetImportOperation, index: number): void => {
    const isSuccess: boolean = operationSuccess[index] === true;

    if (!isSuccess) {
      failed += 1;
      return;
    }

    if (operation.type === 'insert') {
      inserted += 1;
      return;
    }

    updated += 1;
  });

  return {
    inserted,
    updated,
    failed
  };
}

export async function loadProductCodeIdMap(siteUrl: string, spHttpClient: SPHttpClient): Promise<Map<string, number>> {
  const items: TSharePointItem[] = await getListItems(siteUrl, spHttpClient, LST_SAN_PHAM, ['Id', 'ProductCode']);
  const codeToIdMap: Map<string, number> = new Map<string, number>();

  items.forEach((item: TSharePointItem): void => {
    const productCode: string = getStringValue(item, ['ProductCode']).trim();

    if (!productCode) {
      return;
    }

    const itemId: number = Number(item.Id);

    if (!itemId) {
      return;
    }

    codeToIdMap.set(productCode.toUpperCase(), itemId);
  });

  return codeToIdMap;
}

export async function previewAssetImportFromExcel(
  fileBuffer: ArrayBuffer,
  existingCodeToIdMap: Map<string, number>
): Promise<IAssetImportPlan & { skippedEmptyRows: number; totalRows: number }> {
  const parsedResult = await parseAssetImportWorkbook(fileBuffer);
  const plan: IAssetImportPlan = buildImportPlan(parsedResult.rows, existingCodeToIdMap);

  return {
    ...plan,
    skippedEmptyRows: parsedResult.skippedEmptyRows,
    totalRows: parsedResult.rows.length
  };
}

export async function importAssetsFromExcel(options: IAssetImportOptions): Promise<IAssetImportResult> {
  const parsedResult = await parseAssetImportWorkbook(options.fileBuffer);
  const rows: IAssetImportRow[] = parsedResult.rows;

  if (!rows.length) {
    throw new Error('Không có dòng hợp lệ nào để import. Kiểm tra header và cột ProductCode.');
  }

  const existingCodeToIdMap: Map<string, number> = await loadProductCodeIdMap(options.siteUrl, options.spHttpClient);
  const plan: IAssetImportPlan = buildImportPlan(rows, existingCodeToIdMap);
  const batchResult = await executeImportBatches(
    options.siteUrl,
    options.spHttpClient,
    LST_SAN_PHAM,
    plan.operations,
    options.onProgress
  );
  const resultCounts = countImportResults(plan.operations, batchResult.operationSuccess);

  return {
    inserted: resultCounts.inserted,
    updated: resultCounts.updated,
    failed: resultCounts.failed,
    errors: batchResult.errors,
    totalRows: rows.length
  };
}
