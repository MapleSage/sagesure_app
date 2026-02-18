import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';
import * as fc from 'fast-check';

/**
 * Test utilities and helpers for frontend testing
 */

/**
 * Create a test query client with default options
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });

/**
 * Wrapper component with all providers for testing
 */
interface AllProvidersProps {
  children: ReactNode;
}

export const AllProviders = ({ children }: AllProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Custom render function with all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

/**
 * Fast-check arbitraries for common frontend data types
 */
export const arbitraries = {
  // Email arbitrary
  email: () =>
    fc
      .tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'example.com')
      )
      .map(([local, domain]) => `${local}@${domain}`),

  // Non-empty string
  nonEmptyString: () => fc.string({ minLength: 1, maxLength: 100 }),

  // Risk score (0-100)
  riskScore: () => fc.integer({ min: 0, max: 100 }),

  // URL arbitrary
  url: () =>
    fc
      .tuple(
        fc.constantFrom('http', 'https'),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.constantFrom('com', 'org', 'net', 'in')
      )
      .map(([protocol, domain, tld]) => `${protocol}://${domain}.${tld}`),
};

/**
 * Helper to run property-based tests with consistent configuration
 */
export const runPropertyTest = <T,>(
  property: fc.IProperty<T>,
  options: fc.Parameters<T> = {}
) => {
  return fc.assert(property, {
    numRuns: 100, // Minimum 100 runs per property test
    verbose: true,
    ...options,
  });
};

/**
 * Mock API response helper
 */
export const mockApiResponse = <T,>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

/**
 * Mock API error helper
 */
export const mockApiError = (message: string, status = 500) => ({
  response: {
    data: {
      error: {
        code: 'TEST_ERROR',
        message,
        timestamp: new Date().toISOString(),
        requestId: 'test-request-id',
        path: '/test',
      },
    },
    status,
    statusText: 'Error',
    headers: {},
    config: {} as any,
  },
});
