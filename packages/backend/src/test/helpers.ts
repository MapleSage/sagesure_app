import * as fc from 'fast-check';

/**
 * Test utilities and helpers for backend testing
 */

/**
 * Fast-check arbitraries for common data types
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

  // Password arbitrary (8-50 chars, mixed case, numbers, special chars)
  password: () =>
    fc.stringOf(
      fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'.split('')
      ),
      { minLength: 8, maxLength: 50 }
    ),

  // Phone number arbitrary (Indian format)
  phoneNumber: () =>
    fc
      .tuple(fc.constantFrom('6', '7', '8', '9'), fc.integer({ min: 100000000, max: 999999999 }))
      .map(([first, rest]) => `${first}${rest}`),

  // Risk score arbitrary (0-100)
  riskScore: () => fc.integer({ min: 0, max: 100 }),

  // UUID arbitrary
  uuid: () =>
    fc
      .tuple(
        fc.hexaString({ minLength: 8, maxLength: 8 }),
        fc.hexaString({ minLength: 4, maxLength: 4 }),
        fc.hexaString({ minLength: 4, maxLength: 4 }),
        fc.hexaString({ minLength: 4, maxLength: 4 }),
        fc.hexaString({ minLength: 12, maxLength: 12 })
      )
      .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`),

  // ISO timestamp arbitrary
  timestamp: () => fc.date().map((d) => d.toISOString()),

  // User role arbitrary
  userRole: () =>
    fc.constantFrom('CONSUMER', 'BROKER', 'AGENT', 'INSURER', 'REGULATOR', 'ADMIN'),
};

/**
 * Mock request object for Express testing
 */
export const mockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ip: '127.0.0.1',
  path: '/test',
  method: 'GET',
  ...overrides,
});

/**
 * Mock response object for Express testing
 */
export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Mock next function for Express middleware testing
 */
export const mockNext = () => jest.fn();

/**
 * Helper to run property-based tests with consistent configuration
 */
export const runPropertyTest = <T>(
  property: fc.IProperty<T>,
  options: fc.Parameters<T> = {}
) => {
  return fc.assert(property, {
    numRuns: 100, // Minimum 100 runs per property test
    verbose: true,
    ...options,
  });
};
