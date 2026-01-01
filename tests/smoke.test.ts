import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';

describe('Smoke Test', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should load Phaser', () => {
    expect(Phaser).toBeDefined();
    expect(Phaser.Game).toBeDefined();
  });

  it('should support mocked localStorage', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
    localStorage.removeItem('test');
    expect(localStorage.getItem('test')).toBeNull();
  });
});
