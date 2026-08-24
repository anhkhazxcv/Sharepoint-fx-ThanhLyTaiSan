import { buildTransferContent } from '../workspace/orderMappers';

describe('orderMappers.buildTransferContent', () => {
  it('prefixes order id with muathanhly', () => {
    expect(buildTransferContent('ORD-123')).toBe('muathanhly ORD-123');
  });

  it('trims surrounding whitespace from order id', () => {
    expect(buildTransferContent('  ORD-456  ')).toBe('muathanhly ORD-456');
  });
});
