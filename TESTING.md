# Testing Guide for RivianSpotter

This guide provides an overview of the automated testing framework for RivianSpotter.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests (requires PHP server)
npm run test:e2e          # End-to-end tests

# Development mode
npm run test:watch        # Watch mode for development
```

### 3. View Coverage

After running tests, open the coverage report:

```bash
open coverage/lcov-report/index.html
```

## Test Structure

```
tests/
├── setup.js              # Global test configuration
├── helpers.js            # Test utility functions
├── unit/                 # Unit tests (fast, isolated)
│   ├── utils.test.js
│   ├── config.test.js
│   └── data-loader.test.js
├── integration/          # Integration tests (require PHP)
│   └── api.test.js
└── e2e/                  # End-to-end tests
    └── basic.test.js
```

## What's Tested

### Unit Tests

1. **Utility Functions** (`utils.test.js`)
   - HTML sanitization (XSS prevention)
   - Coordinate validation
   - Debounce functionality
   - Haversine distance calculation

2. **Configuration** (`config.test.js`)
   - Map settings validation
   - Performance configuration
   - Security settings
   - Data loading configuration

3. **Data Loader** (`data-loader.test.js`)
   - Cache management
   - Data validation
   - String sanitization
   - Location data structure

### Integration Tests

**API Endpoints** (`api.test.js`)
- GET /api/locations.php
- POST /api/locations.php
- PUT /api/locations.php
- DELETE /api/locations.php
- Authentication
- Rate limiting
- Error handling

### End-to-End Tests

**UI Flow** (`basic.test.js`)
- Page structure
- Location display
- Filtering
- Search
- Mobile UI
- Loading states

## Coverage Goals

Target: 70% coverage across:
- Branches
- Functions
- Lines
- Statements

Current exclusions:
- `js/locations.js` (data file)
- `js/components.js` (template components)

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

GitHub Actions workflow: `.github/workflows/test.yml`

## Running Integration Tests

Integration tests require a PHP server:

### Option 1: Built-in PHP Server

```bash
# Terminal 1
php -S localhost:8000

# Terminal 2
npm run test:integration
```

### Option 2: Docker

```bash
docker run -d -p 8000:80 -v $(pwd):/var/www/html php:8.2-cli php -S 0.0.0.0:80
npm run test:integration
```

### Option 3: Skip Integration Tests

```bash
npm run test:unit
```

## Writing New Tests

1. Create test file in appropriate directory
2. Import test helpers if needed
3. Follow naming convention: `*.test.js`
4. Use descriptive test names
5. Follow AAA pattern (Arrange, Act, Assert)

Example:

```javascript
const { createMockLocation } = require('../helpers');

describe('New Feature', () => {
    it('should do something specific', () => {
        // Arrange
        const location = createMockLocation();

        // Act
        const result = someFunction(location);

        // Assert
        expect(result).toBeDefined();
    });
});
```

## Troubleshooting

### Tests Not Running

- Check Node.js version (18.x or higher)
- Run `npm install` to install dependencies
- Check for syntax errors in test files

### Integration Tests Failing

- Ensure PHP server is running
- Check API_URL environment variable
- Verify admin token is correct

### Low Coverage

- Add tests for uncovered code
- Use `npm run test:verbose` to see what's missing
- Check coverage report in `coverage/` directory

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Full Testing Documentation](tests/README.md)

## Questions?

See the detailed documentation in `tests/README.md` or open an issue on GitHub.
