# RivianSpotter Testing Framework

This directory contains the automated testing suite for RivianSpotter. The tests are designed to be lightweight, fast, and comprehensive, covering unit tests, integration tests, and basic end-to-end tests.

## Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Setup

### Prerequisites

- Node.js 18.x or higher
- npm (comes with Node.js)
- PHP 8.0+ (for integration tests)

### Installation

Install test dependencies:

```bash
npm install
```

This will install:
- Jest (test runner)
- jest-environment-jsdom (DOM testing)
- node-fetch (API testing)
- supertest (HTTP testing)

## Running Tests

### All Tests

Run the complete test suite with coverage:

```bash
npm test
```

### Test by Type

Run specific test suites:

```bash
# Unit tests only
npm run test:unit

# Integration tests only (requires PHP server)
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Watch Mode

Run tests in watch mode for development:

```bash
npm run test:watch
```

### CI Mode

Run tests in CI mode (used by GitHub Actions):

```bash
npm run test:ci
```

### Verbose Output

Run tests with detailed output:

```bash
npm run test:verbose
```

## Test Structure

```
tests/
├── setup.js                 # Global test setup and mocks
├── unit/                    # Unit tests
│   ├── utils.test.js        # Utility function tests
│   ├── config.test.js       # Configuration tests
│   └── data-loader.test.js  # DataLoader class tests
├── integration/             # Integration tests
│   └── api.test.js          # API endpoint tests
└── e2e/                     # End-to-end tests
    └── basic.test.js        # Basic UI flow tests
```

## Test Coverage

### Current Test Coverage

The test suite aims for the following coverage targets:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Viewing Coverage

Generate and view coverage report:

```bash
npm test
# Coverage report will be in coverage/ directory
# Open coverage/lcov-report/index.html in a browser
```

### What's Tested

#### Unit Tests (`tests/unit/`)

1. **utils.test.js** - Utility Functions
   - HTML sanitization (XSS prevention)
   - Coordinate validation
   - Debounce functionality
   - Haversine distance calculation

2. **config.test.js** - Configuration
   - Map configuration validation
   - Performance settings
   - Security settings
   - Data loading settings
   - UI settings

3. **data-loader.test.js** - Data Loading
   - Cache management
   - Data validation
   - String sanitization
   - Location data structure validation

#### Integration Tests (`tests/integration/`)

1. **api.test.js** - API Endpoints
   - GET /api/locations.php
   - POST /api/locations.php (create)
   - PUT /api/locations.php (update)
   - DELETE /api/locations.php (delete)
   - Authentication
   - Rate limiting
   - CORS headers
   - Error handling

#### E2E Tests (`tests/e2e/`)

1. **basic.test.js** - UI Flow
   - Page structure
   - Location display
   - Filter functionality
   - Search functionality
   - Mobile UI
   - Loading states
   - Accessibility

## Writing Tests

### Test Template

```javascript
// tests/unit/example.test.js

describe('Feature Name', () => {
    beforeEach(() => {
        // Setup code
    });

    afterEach(() => {
        // Cleanup code
    });

    describe('Specific Functionality', () => {
        it('should do something specific', () => {
            // Arrange
            const input = 'test';

            // Act
            const result = someFunction(input);

            // Assert
            expect(result).toBe('expected');
        });
    });
});
```

### Best Practices

1. **Use Descriptive Names**: Test names should clearly describe what they test
   ```javascript
   // Good
   it('should sanitize HTML script tags to prevent XSS attacks', () => {})

   // Bad
   it('test sanitize', () => {})
   ```

2. **Follow AAA Pattern**: Arrange, Act, Assert
   ```javascript
   it('should calculate distance correctly', () => {
       // Arrange
       const lat1 = 34.0522, lng1 = -118.2437;
       const lat2 = 40.7128, lng2 = -74.0060;

       // Act
       const distance = calculateDistance(lat1, lng1, lat2, lng2);

       // Assert
       expect(distance).toBeGreaterThan(2400);
   });
   ```

3. **Test Edge Cases**: Don't just test the happy path
   ```javascript
   it('should handle empty string', () => {});
   it('should handle null values', () => {});
   it('should handle boundary values', () => {});
   ```

4. **Keep Tests Independent**: Tests should not depend on each other
   ```javascript
   // Each test should be able to run independently
   beforeEach(() => {
       // Reset state for each test
   });
   ```

5. **Mock External Dependencies**: Use mocks for external services
   ```javascript
   // Mock API calls
   global.fetch = jest.fn(() =>
       Promise.resolve({
           json: () => Promise.resolve({ data: 'mock' })
       })
   );
   ```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI pipeline includes:
1. **Unit Tests**: Fast, isolated tests
2. **Integration Tests**: API tests with PHP server
3. **Coverage Report**: Code coverage analysis
4. **Security Audit**: npm audit for vulnerabilities
5. **Linting**: Code quality checks

### Workflow File

The GitHub Actions workflow is defined in `.github/workflows/test.yml`

### Environment Variables for CI

For integration tests in CI, set these secrets in your GitHub repository:

- `CODECOV_TOKEN` (optional): For coverage reports
- `ADMIN_TOKEN`: API admin token for integration tests

## Integration Test Setup

Integration tests require a PHP server. To run them locally:

### Method 1: Using Built-in PHP Server

```bash
# Terminal 1: Start PHP server
php -S localhost:8000

# Terminal 2: Run integration tests
npm run test:integration
```

### Method 2: Using Docker

```bash
# Start PHP server in Docker
docker run -d -p 8000:80 -v $(pwd):/var/www/html php:8.2-cli php -S 0.0.0.0:80 -t /var/www/html

# Run tests
npm run test:integration

# Stop container
docker stop <container-id>
```

### Method 3: Skip Integration Tests

```bash
# Run only unit tests
npm run test:unit
```

## Troubleshooting

### Tests Failing

**Problem**: Tests fail with "Mapbox is not defined"
**Solution**: The test setup includes mocks for Mapbox. Check that `tests/setup.js` is being loaded correctly.

**Problem**: Integration tests fail with connection errors
**Solution**: Make sure PHP server is running on port 8000 before running integration tests.

**Problem**: Coverage thresholds not met
**Solution**: Add more tests or adjust thresholds in `package.json` under `jest.coverageThreshold`.

### Performance Issues

**Problem**: Tests are slow
**Solution**:
- Run specific test suites instead of all tests
- Use `test:watch` mode for development
- Check for long-running integration tests

### Mock Issues

**Problem**: DOM elements not found
**Solution**: Check that `tests/setup.js` creates the necessary DOM structure, or add elements in your test's `beforeEach`.

**Problem**: API mocks not working
**Solution**: Ensure you're using the mocked fetch from the test setup, not a real fetch.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Mocking Guide](https://jestjs.io/docs/mock-functions)

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Check coverage hasn't decreased
4. Update this README if needed

## Questions?

If you have questions about the tests or need help writing new ones, please open an issue on GitHub.
