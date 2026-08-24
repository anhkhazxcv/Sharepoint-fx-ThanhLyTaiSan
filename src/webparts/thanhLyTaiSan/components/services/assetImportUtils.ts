export interface IAssetImportRow {
  productCode: string;
  productName: string;
  barcode: string;
  descriptionProduct: string;
  stock: number;
  unitOfMeasure: string;
  inServiceDate: string;
  price: number;
  imageName: string;
  condition: string;
  legalEntity: string;
  site: string;
  address: string;
  isVisibleToBuyer: boolean;
}

export interface IAssetImportOperation {
  type: 'insert' | 'update';
  productCode: string;
  itemId?: number;
  etag?: string;
  payload: Record<string, unknown>;
}

export interface IAssetImportPlan {
  insertCount: number;
  updateCount: number;
  operations: IAssetImportOperation[];
}

export interface IAssetImportParseResult {
  rows: IAssetImportRow[];
  skippedEmptyRows: number;
}

export const ASSET_IMPORT_MAX_ROWS: number = 2000;

const HEADER_FIELD_MAP: Record<string, keyof IAssetImportRow> = {
  address: 'address',
  productcode: 'productCode',
  barcode: 'barcode',
  productname: 'productName',
  descriptionproduct: 'descriptionProduct',
  stock: 'stock',
  unitofmeasure: 'unitOfMeasure',
  inservicedate: 'inServiceDate',
  price: 'price',
  imagename: 'imageName',
  condition: 'condition',
  legalentity: 'legalEntity',
  site: 'site',
  isvisibletobuyer: 'isVisibleToBuyer'
};

function normalizeHeader(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function normalizeProductCode(value: unknown): string {
  return String(value || '').trim();
}

function parseImportBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalizedValue: string = String(value).trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0' || normalizedValue === 'no') {
    return false;
  }

  return defaultValue;
}

function parseImportNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    let normalizedValue: string = value
      .trim()
      .replace(/\u00a0/g, ' ')
      .replace(/đ|₫/gi, '')
      .replace(/\bvnd\b/gi, '')
      .replace(/\s+/g, '');

    if (/^\d{1,3}(\.\d{3})+$/.test(normalizedValue)) {
      normalizedValue = normalizedValue.replace(/\./g, '');
    } else {
      normalizedValue = normalizedValue.replace(/,/g, '');
    }

    const parsedValue: number = Number(normalizedValue);

    if (!isNaN(parsedValue)) {
      return parsedValue;
    }
  }

  return defaultValue;
}

function formatDateValue(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && !isNaN(value)) {
    const excelEpoch: Date = new Date(Date.UTC(1899, 11, 30));
    const parsedDate: Date = new Date(excelEpoch.getTime() + value * 86400000);

    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  const rawValue: string = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  const parsedDate: Date = new Date(rawValue);

  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return rawValue;
}

function createEmptyImportRow(): IAssetImportRow {
  return {
    productCode: '',
    productName: '',
    barcode: '',
    descriptionProduct: '',
    stock: 0,
    unitOfMeasure: '',
    inServiceDate: '',
    price: 0,
    imageName: '',
    condition: '',
    legalEntity: '',
    site: '',
    address: '',
    isVisibleToBuyer: true
  };
}

export function mapRawImportRow(rawRow: Record<string, unknown>): IAssetImportRow | undefined {
  const row: IAssetImportRow = createEmptyImportRow();
  let hasMappedField: boolean = false;

  Object.keys(rawRow).forEach((headerKey: string) => {
    const fieldKey: keyof IAssetImportRow | undefined = HEADER_FIELD_MAP[normalizeHeader(headerKey)];

    if (!fieldKey) {
      return;
    }

    hasMappedField = true;
    const cellValue: unknown = rawRow[headerKey];

    if (fieldKey === 'stock' || fieldKey === 'price') {
      row[fieldKey] = parseImportNumber(cellValue, 0);
      return;
    }

    if (fieldKey === 'isVisibleToBuyer') {
      row.isVisibleToBuyer = parseImportBoolean(cellValue, true);
      return;
    }

    if (fieldKey === 'inServiceDate') {
      row.inServiceDate = formatDateValue(cellValue);
      return;
    }

    if (fieldKey === 'productCode') {
      row.productCode = normalizeProductCode(cellValue);
      return;
    }

    row[fieldKey] = String(cellValue || '').trim();
  });

  if (!hasMappedField || !row.productCode) {
    return undefined;
  }

  return row;
}

export function dedupeImportRowsByProductCode(rows: IAssetImportRow[]): IAssetImportRow[] {
  const rowMap: Map<string, IAssetImportRow> = new Map<string, IAssetImportRow>();

  rows.forEach((row: IAssetImportRow): void => {
    rowMap.set(row.productCode.toUpperCase(), row);
  });

  const dedupedRows: IAssetImportRow[] = [];
  rowMap.forEach((row: IAssetImportRow): void => {
    dedupedRows.push(row);
  });

  return dedupedRows;
}

export function mapImportRowToSharePointPayload(row: IAssetImportRow): Record<string, unknown> {
  return {
    Title: row.productName || row.productCode,
    ProductCode: row.productCode,
    ProductName: row.productName,
    Barcode: row.barcode,
    DescriptionProduct: row.descriptionProduct,
    Stock: row.stock,
    UnitOfMeasure: row.unitOfMeasure,
    InServiceDate: row.inServiceDate,
    Price: row.price,
    ImageName: row.imageName,
    Condition: row.condition,
    LegalEntity: row.legalEntity,
    Site: row.site,
    Address: row.address,
    IsVisibleToBuyer: row.isVisibleToBuyer
  };
}

export function buildImportPlan(rows: IAssetImportRow[], existingCodeToIdMap: Map<string, number>): IAssetImportPlan {
  const operations: IAssetImportOperation[] = [];
  let insertCount: number = 0;
  let updateCount: number = 0;

  rows.forEach((row: IAssetImportRow): void => {
    const payload: Record<string, unknown> = mapImportRowToSharePointPayload(row);
    const normalizedCode: string = row.productCode.toUpperCase();
    const existingId: number | undefined = existingCodeToIdMap.get(normalizedCode);

    if (existingId) {
      updateCount += 1;
      operations.push({
        type: 'update',
        productCode: row.productCode,
        itemId: existingId,
        payload
      });
      return;
    }

    insertCount += 1;
    operations.push({
      type: 'insert',
      productCode: row.productCode,
      payload
    });
  });

  return {
    insertCount,
    updateCount,
    operations
  };
}

export async function parseAssetImportWorkbook(fileBuffer: ArrayBuffer): Promise<IAssetImportParseResult> {
  const XLSX = await import(/* webpackChunkName: 'xlsx-import' */ 'xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });

  if (!workbook.SheetNames.length) {
    throw new Error('File Excel không có sheet nào.');
  }

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: true
  });

  if (!rawMatrix.length) {
    return {
      rows: [],
      skippedEmptyRows: 0
    };
  }

  const headerRow: unknown[] = rawMatrix[0];
  const parsedRows: IAssetImportRow[] = [];
  let skippedEmptyRows: number = 0;

  for (let rowIndex: number = 1; rowIndex < rawMatrix.length; rowIndex += 1) {
    const values: unknown[] = rawMatrix[rowIndex];
    const rawRow: Record<string, unknown> = {};

    headerRow.forEach((headerValue: unknown, columnIndex: number): void => {
      const headerLabel: string = String(headerValue || '').trim();

      if (!headerLabel) {
        return;
      }

      rawRow[headerLabel] = values[columnIndex];
    });

    const mappedRow: IAssetImportRow | undefined = mapRawImportRow(rawRow);

    if (!mappedRow) {
      skippedEmptyRows += 1;
      continue;
    }

    parsedRows.push(mappedRow);
  }

  if (parsedRows.length > ASSET_IMPORT_MAX_ROWS) {
    throw new Error('File vượt quá ' + String(ASSET_IMPORT_MAX_ROWS) + ' dòng hợp lệ.');
  }

  return {
    rows: dedupeImportRowsByProductCode(parsedRows),
    skippedEmptyRows
  };
}
