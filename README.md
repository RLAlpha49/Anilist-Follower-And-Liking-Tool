# Nakama

Nakama is an Anilist Relationship Manager application.

## GitHub Workflows

This project uses GitHub Actions to automate testing, code quality checks, and dependency management:

### Tests

The `Tests` workflow runs on every push to the `electron-app` branch, on pull requests, and on a weekly schedule (Thursday at midnight). It performs:

- **Unit Tests**: Runs Vitest unit tests
- **E2E Tests**: Runs Playwright end-to-end tests

### Code Quality

The `Code Quality` workflow runs on every push to the `electron-app` branch, on pull requests, and on a weekly schedule (Wednesday at midnight). It performs:

- **Linting**: Runs ESLint to check code quality
- **Formatting**: Verifies code follows Prettier formatting rules
- **Package Updates Check**: Displays available package updates

### Check for Package Updates

The `Check for Package Updates` workflow can be manually triggered from the Actions tab. It:

- Checks for available npm package updates
- Can automatically create a pull request with the updates (optional)
- Also runs on a weekly schedule (Monday at midnight)

To run this workflow:
1. Go to the Actions tab
2. Select "Check for Package Updates" workflow
3. Click "Run workflow"
4. Optionally enable "Automatically update package.json"
5. Click "Run workflow" again

## Development

[Add development setup instructions here]

## Testing

```bash
# Run unit tests
npm run test:unit

# Run e2e tests
npm run test:e2e

# Run all tests
npm test

# Run unit tests in watch mode
npm run test:watch
```

## Formatting and Linting

```bash
# Check code formatting
npm run format

# Fix code formatting
npm run format:write

# Run linter
npm run lint
```

## Package Management

```bash
# Check for package updates
npx npm-check-updates

# Update all packages in package.json
npm run update

# Install dependencies after updating
npm install
```
