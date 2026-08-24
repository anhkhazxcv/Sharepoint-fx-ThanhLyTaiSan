jest.mock('@microsoft/sp-http', () => ({
  SPHttpClient: {
    configurations: {
      v1: {}
    }
  }
}));

import { buildOrFilter, escapeODataValue, getBooleanValue, getNumberValue, getStringValue } from './sharePointListUtils';

describe('sharePointListUtils', () => {
  it('getStringValue returns first non-empty string candidate', () => {
    expect(getStringValue({ Title: '  Alpha  ', Label: 'Beta' }, ['Label', 'Title'])).toBe('Beta');
    expect(getStringValue({ Title: '  Alpha  ' }, ['Label', 'Title'])).toBe('Alpha');
    expect(getStringValue({ Foo: '' }, ['Foo', 'Bar'], 'fallback')).toBe('fallback');
  });

  it('getNumberValue parses string numbers', () => {
    expect(getNumberValue({ Quantity: '12' }, ['Quantity'])).toBe(12);
    expect(getNumberValue({ Quantity: 'bad' }, ['Quantity'], 3)).toBe(3);
  });

  it('getBooleanValue parses SharePoint yes/no values with fallback', () => {
    expect(getBooleanValue({ IsVisibleToBuyer: true }, ['IsVisibleToBuyer'], true)).toBe(true);
    expect(getBooleanValue({ IsVisibleToBuyer: false }, ['IsVisibleToBuyer'], true)).toBe(false);
    expect(getBooleanValue({ IsVisibleToBuyer: 1 }, ['IsVisibleToBuyer'], false)).toBe(true);
    expect(getBooleanValue({ IsVisibleToBuyer: 'No' }, ['IsVisibleToBuyer'], true)).toBe(false);
    expect(getBooleanValue({}, ['IsVisibleToBuyer'], true)).toBe(true);
  });

  it('escapeODataValue doubles single quotes', () => {
    expect(escapeODataValue("O'Brien")).toBe("O''Brien");
  });

  it('buildOrFilter joins equality clauses with or', () => {
    expect(buildOrFilter('OrderId', ['A-1', "B'2"])).toBe("OrderId eq 'A-1' or OrderId eq 'B''2'");
  });
});
