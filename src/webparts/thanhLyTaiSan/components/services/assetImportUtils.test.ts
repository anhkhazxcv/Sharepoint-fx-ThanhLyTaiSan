import {
  buildImportPlan,
  dedupeImportRowsByProductCode,
  mapImportRowToSharePointPayload,
  mapRawImportRow,
  type IAssetImportRow
} from './assetImportUtils';

describe('assetImportUtils', () => {
  function createRow(overrides: Partial<IAssetImportRow> = {}): IAssetImportRow {
    return {
      productCode: 'TS001',
      productName: 'Tai san A',
      barcode: 'BC001',
      descriptionProduct: 'Mo ta',
      stock: 5,
      unitOfMeasure: 'Cai',
      inServiceDate: '2024-01-01',
      price: 100000,
      imageName: 'a.jpg',
      condition: 'Moi',
      legalEntity: 'MAG',
      site: 'HN',
      address: 'Ha Noi',
      isVisibleToBuyer: true,
      ...overrides
    };
  }

  it('parses Price from various Excel number formats', () => {
    const cases: Array<{ price: unknown; expected: number }> = [
      { price: 1500000, expected: 1500000 },
      { price: '1500000', expected: 1500000 },
      { price: '1.500.000', expected: 1500000 },
      { price: '1 500 000', expected: 1500000 },
      { price: '1.500.000 ₫', expected: 1500000 },
      { price: '', expected: 0 },
      { price: 'invalid', expected: 0 }
    ];

    cases.forEach(({ price, expected }: { price: unknown; expected: number }) => {
      const row = mapRawImportRow({
        ProductCode: 'TS-PRICE',
        Price: price
      });

      expect(row?.price).toBe(expected);
    });
  });

  it('maps SharePoint payload with parsed Price', () => {
    const row = mapRawImportRow({
      ProductCode: 'TS-PRICE',
      Price: '1.500.000'
    });
    const payload = mapImportRowToSharePointPayload(row as IAssetImportRow);

    expect(payload.Price).toBe(1500000);
  });

  it('parses Stock from formatted strings', () => {
    const row = mapRawImportRow({
      ProductCode: 'TS-STOCK',
      Stock: '1.234'
    });

    expect(row?.stock).toBe(1234);
  });

  it('maps SharePoint payload with DescriptionProduct', () => {
    const payload = mapImportRowToSharePointPayload(createRow({ descriptionProduct: 'Mo ta san pham' }));

    expect(payload.DescriptionProduct).toBe('Mo ta san pham');
    expect(payload).not.toHaveProperty('Description');
  });

  it('maps only supported headers including IsVisibleToBuyer', () => {
    const row = mapRawImportRow({
      ProductCode: 'TS002',
      ProductName: 'Tai san B',
      IsVisibleToBuyer: 'No',
      IsVisible: 'Yes'
    });

    expect(row).toBeDefined();
    expect(row?.productCode).toBe('TS002');
    expect(row?.isVisibleToBuyer).toBe(false);
  });

  it('skips rows without ProductCode', () => {
    expect(mapRawImportRow({ ProductName: 'Khong co ma' })).toBeUndefined();
  });

  it('builds insert and update operations by ProductCode', () => {
    const rows: IAssetImportRow[] = [
      createRow({ productCode: 'TS001' }),
      createRow({ productCode: 'TS002' }),
      createRow({ productCode: 'TS003' })
    ];
    const existingMap: Map<string, number> = new Map<string, number>([['TS002', 12]]);

    const plan = buildImportPlan(rows, existingMap);

    expect(plan.insertCount).toBe(2);
    expect(plan.updateCount).toBe(1);
    expect(plan.operations).toHaveLength(3);
    expect(plan.operations[1]).toEqual({
      type: 'update',
      productCode: 'TS002',
      itemId: 12,
      payload: mapImportRowToSharePointPayload(rows[1])
    });
  });

  it('dedupes duplicate ProductCode keeping the last row', () => {
    const dedupedRows: IAssetImportRow[] = dedupeImportRowsByProductCode([
      createRow({ productCode: 'TS001', stock: 1 }),
      createRow({ productCode: 'TS001', stock: 9 })
    ]);

    expect(dedupedRows).toHaveLength(1);
    expect(dedupedRows[0].stock).toBe(9);
  });
});
