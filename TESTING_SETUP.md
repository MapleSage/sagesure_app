# Testing Setup - SageSure India Platform

## Overview

The testing infrastructure has been configured for both backend and frontend workspaces, supporting both unit tests and property-based tests.

## Testing Frameworks

### Jest
- **Purpose:** Unit testing framework
- **Configuration:** `jest.config.js` in both workspaces
- **Coverage:** 80% threshold for branches, functions, lines, and statements
- **Timeout:** 10 seconds per test

### fast-check
- **Purpose:** Property-based testing
- **Configuration:** Integrated with Jest
- **Runs:** Minimum 100 iterations per property test
- **Usage:** Test universal properties across random inputs

## Backend Testing

### Configuration Files
- `packages/backend/jest.config.js` - Jest configuration
- `packages/backend/src/test/helpers.ts` - Test utilities and arbitraries

### Test Utilities

**Mock Helpers:**
```typescript
import { mockRequest, mockResponse, mockNext } from './test/helpers';

const req = mockRequest({ body: { email: 'test@example.com' } });
const res = mockResponse();
const next = mockNext();
```

**Fast-check Arbitraries:**
```typescript
import { arbitraries } from './test/helpers';

// Generate random emails
fc.assert(
  fc.property(arbitraries.email(), (email) => {
    expect(email).toMatch(/@/);
  })
);

// Generate random risk scores (0-100)
fc.assert(
  fc.property(arbitraries.riskScore(), (score) => {
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  })
);
```

**Available Arbitraries:**
- `email()` - Valid email addresses
- `password()` - Strong passwords (8-50 chars)
- `phoneNumber()` - Indian phone numbers
- `riskScore()` - Scores from 0-100
- `uuid()` - Valid UUIDs
- `timestamp()` - ISO timestamps
- `userRole()` - User roles (CONSUMER, BROKER, etc.)

### Running Tests

```bash
cd packages/backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- logger.test.ts
```

### Example Unit Test

```typescript
describe('Authentication Service', () => {
  it('should hash passwords correctly', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
});
```

### Example Property Test

```typescript
import * as fc from 'fast-check';
import { runPropertyTest, arbitraries } from './test/helpers';

describe('Property: Password encryption irreversibility', () => {
  it('should never store plaintext passwords', () => {
    runPropertyTest(
      fc.property(arbitraries.password(), async (password) => {
        const hash = await hashPassword(password);
        expect(hash).not.toBe(password);
        expect(hash).not.toContain(password);
      })
    );
  });
});
```

## Frontend Testing

### Configuration Files
- `packages/frontend/jest.config.js` - Jest configuration
- `packages/frontend/src/test/setup.ts` - Test setup with jest-dom
- `packages/frontend/src/test/helpers.tsx` - Test utilities and providers

### Test Utilities

**Render with Providers:**
```typescript
import { renderWithProviders } from './test/helpers';

test('renders component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

**Mock API Responses:**
```typescript
import { mockApiResponse, mockApiError } from './test/helpers';

const successResponse = mockApiResponse({ data: 'test' }, 200);
const errorResponse = mockApiError('Not found', 404);
```

**Fast-check Arbitraries:**
```typescript
import { arbitraries } from './test/helpers';

// Generate random emails
fc.assert(
  fc.property(arbitraries.email(), (email) => {
    expect(email).toMatch(/@/);
  })
);
```

**Available Arbitraries:**
- `email()` - Valid email addresses
- `nonEmptyString()` - Non-empty strings
- `riskScore()` - Scores from 0-100
- `url()` - Valid URLs

### Running Tests

```bash
cd packages/frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- App.test.tsx
```

### Example Component Test

```typescript
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/helpers';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('should render email and password fields', () => {
    renderWithProviders(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
```

### Example Property Test

```typescript
import * as fc from 'fast-check';
import { runPropertyTest, arbitraries } from './test/helpers';

describe('Property: Form error handling', () => {
  it('should focus first error field for any form errors', () => {
    runPropertyTest(
      fc.property(
        fc.array(arbitraries.nonEmptyString(), { minLength: 1 }),
        (errors) => {
          const form = renderForm(errors);
          const firstErrorField = form.querySelector('[aria-invalid="true"]');
          expect(document.activeElement).toBe(firstErrorField);
        }
      )
    );
  });
});
```

## Property-Based Testing Guidelines

### When to Use Property Tests

Use property-based tests for:
- **Universal properties** that should hold for all inputs
- **Invariants** that must never be violated
- **Round-trip properties** (encrypt/decrypt, serialize/deserialize)
- **Performance bounds** (response time < 2s)
- **Security properties** (passwords never stored in plaintext)

### Property Test Structure

```typescript
describe('Property: {Property Name}', () => {
  it('should {behavior description}', () => {
    runPropertyTest(
      fc.property(
        arbitrary1,
        arbitrary2,
        (input1, input2) => {
          // Test the property
          const result = functionUnderTest(input1, input2);
          expect(result).toSatisfyProperty();
        }
      )
    );
  });
});
```

### Property Test Tagging

Tag property tests with the design document property number:

```typescript
/**
 * Feature: sagesure-india-platform
 * Property 1: Password encryption irreversibility
 * Validates: Requirements 1.1
 */
describe('Property 1: Password encryption irreversibility', () => {
  // Test implementation
});
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# Backend coverage
packages/backend/coverage/
  ├── lcov-report/index.html  # HTML report
  └── lcov.info               # LCOV format

# Frontend coverage
packages/frontend/coverage/
  ├── lcov-report/index.html  # HTML report
  └── lcov.info               # LCOV format
```

Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

## Coverage Thresholds

Both workspaces enforce 80% coverage for:
- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

Tests will fail if coverage drops below these thresholds.

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook - to be configured)
- Pull requests (CI pipeline - to be configured)
- Before deployment

## Best Practices

### Unit Tests
1. Test one thing per test
2. Use descriptive test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Mock external dependencies
5. Keep tests fast (<100ms per test)

### Property Tests
1. Run minimum 100 iterations
2. Use appropriate arbitraries
3. Test universal properties, not specific examples
4. Document which design property is being tested
5. Use shrinking to find minimal failing cases

### General
1. Write tests before or alongside code (TDD)
2. Maintain 80%+ coverage
3. Run tests locally before committing
4. Fix failing tests immediately
5. Review test output for warnings

## Example Test Files

Example tests have been created:

**Backend:**
- `packages/backend/src/utils/logger.test.ts`
- `packages/backend/src/middleware/errorHandler.test.ts`

**Frontend:**
- `packages/frontend/src/App.test.tsx`

Run these to verify the testing setup:

```bash
# Backend
cd packages/backend && npm test

# Frontend
cd packages/frontend && npm test
```

## Next Steps

1. Write unit tests for new features as they're implemented
2. Write property tests for correctness properties from design document
3. Maintain coverage above 80%
4. Add integration tests for API endpoints
5. Add E2E tests for critical user flows

## Troubleshooting

### Tests not running
- Ensure dependencies are installed: `npm install`
- Check Jest configuration in `jest.config.js`
- Verify test files match pattern: `*.test.ts` or `*.spec.ts`

### Coverage not generating
- Run with coverage flag: `npm test -- --coverage`
- Check `collectCoverageFrom` in `jest.config.js`

### Property tests failing
- Check arbitrary generators are producing valid inputs
- Increase `numRuns` to find edge cases
- Use `fc.sample()` to inspect generated values

### Frontend tests failing
- Ensure `@testing-library/jest-dom` is imported in setup
- Check providers are wrapped correctly
- Mock API calls and external dependencies

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
