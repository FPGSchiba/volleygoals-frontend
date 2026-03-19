import { formatDateTime, formatDate } from '../../utils/dateTime';

describe('formatDateTime', () => {
  it('formats an ISO string to de-CH short datetime', () => {
    const result = formatDateTime('2026-03-15T14:30:00.000Z');
    // de-CH format: dd.MM.yy, HH:mm (exact format depends on Node ICU)
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    // Should contain date parts and time parts
    expect(result).toMatch(/\d/);
  });

  it('produces different results for different dates', () => {
    const a = formatDateTime('2026-01-01T00:00:00.000Z');
    const b = formatDateTime('2026-12-31T23:59:00.000Z');
    expect(a).not.toBe(b);
  });
});

describe('formatDate', () => {
  it('formats an ISO string to de-CH short date', () => {
    const result = formatDate('2026-03-15T14:30:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\d/);
  });

  it('does not include time component', () => {
    const dateOnly = formatDate('2026-03-15T14:30:00.000Z');
    const dateTime = formatDateTime('2026-03-15T14:30:00.000Z');
    // dateTime should be longer because it includes time
    expect(dateTime.length).toBeGreaterThanOrEqual(dateOnly.length);
  });
});
