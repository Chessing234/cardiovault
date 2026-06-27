import '@testing-library/jest-dom';

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'jest-session-secret-32-characters!!';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useParams() {
    return {};
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'ethereum', {
    writable: true,
    configurable: true,
    value: {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      isMetaMask: true,
    },
  });
}
