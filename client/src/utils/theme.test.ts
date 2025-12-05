// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getInitialTheme } from './theme';

describe('getInitialTheme', () => {
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
  };
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn()
    };
    vi.stubGlobal('localStorage', localStorageMock);

    matchMediaMock = vi.fn();
    vi.stubGlobal('matchMedia', matchMediaMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should use user preference `night` as dark when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null);
    matchMediaMock.mockReturnValue({ matches: false });
    expect(getInitialTheme('night')).toBe('dark');
  });

  it('should treat user preference other than `night` as light when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null);
    matchMediaMock.mockReturnValue({ matches: false });
    expect(getInitialTheme('default')).toBe('light');
  });

  it('should prioritize localStorage over user preference and system preference', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    matchMediaMock.mockReturnValue({ matches: false });
    expect(getInitialTheme('default')).toBe('dark');

    localStorageMock.getItem.mockReturnValue('light');
    matchMediaMock.mockReturnValue({ matches: true });
    expect(getInitialTheme('night')).toBe('light');
  });

  it('should fall back to system preference when localStorage and user preference are empty', () => {
    localStorageMock.getItem.mockReturnValue(null);

    // Simulate dark system preference
    matchMediaMock.mockReturnValue({ matches: true });
    expect(getInitialTheme()).toBe('dark');

    // Simulate light system preference
    matchMediaMock.mockReturnValue({ matches: false });
    expect(getInitialTheme()).toBe('light');
  });
});
