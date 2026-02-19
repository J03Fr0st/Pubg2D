import { describe, expect, it } from 'vitest';
import { formatElapsedTime, formatTimestamp } from './time-helpers';

describe('time-helpers', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatElapsedTime(0)).toBe('00:00');
    expect(formatElapsedTime(95)).toBe('01:35');
    expect(formatElapsedTime(3661)).toBe('61:01');
  });

  it('formats ISO timestamp as short date/time', () => {
    const result = formatTimestamp('2026-02-11T23:02:00Z');
    expect(result).toContain('Feb 11');
    expect(result).toContain('23:02');
  });
});
