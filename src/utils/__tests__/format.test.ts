import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { STATUS_ICONS, colorStatus, formatLabel, TREE } from '../format.js';
import { VALID_STATUSES } from '../../models/types.js';

describe('format utils', () => {
  const originalNoColor = process.env.NO_COLOR;

  beforeEach(() => {
    delete process.env.NO_COLOR;
  });

  afterEach(() => {
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  it('STATUS_ICONS covers all statuses', () => {
    for (const status of VALID_STATUSES) {
      expect(STATUS_ICONS[status]).toBeDefined();
    }
  });

  it('colorStatus includes icon and status text', () => {
    expect(colorStatus('planned')).toContain('○ planned');
    expect(colorStatus('in_progress')).toContain('● in_progress');
    expect(colorStatus('done')).toContain('✓ done');
    expect(colorStatus('blocked')).toContain('⚠ blocked');
    expect(colorStatus('superseded')).toContain('✗ superseded');
  });

  it('colorStatus disables colors when NO_COLOR set', () => {
    process.env.NO_COLOR = '1';
    const value = colorStatus('done');
    expect(value).toContain('✓ done');
  });

  it('formatLabel pads labels to width', () => {
    expect(formatLabel('next:', 'Hello')).toMatch(/next:\s+Hello/);
    expect(formatLabel('status:', 'planned')).toMatch(/status:\s+planned/);
  });

  it('TREE characters are defined', () => {
    expect(TREE.BRANCH).toBe('├──');
    expect(TREE.LAST).toBe('└──');
    expect(TREE.PIPE).toBe('│  ');
    expect(TREE.SPACE).toBe('   ');
  });
});
