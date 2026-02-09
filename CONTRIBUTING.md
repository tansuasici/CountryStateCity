# Contributing to CountryStateCity

Thank you for your interest in contributing to CountryStateCity! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Running Tests](#running-tests)
- [Reporting Issues](#reporting-issues)

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/CountryStateCity.git
   cd CountryStateCity/country-state-city
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a branch** for your changes (see [Branch Naming](#branch-naming)).
5. **Make your changes**, ensuring they follow the project's code style.
6. **Commit your changes** using conventional commits (see [Commit Messages](#commit-messages)).
7. **Push** your branch and open a pull request.

## Branch Naming

Use the following prefixes for branch names:

| Prefix      | Purpose                      |
| ----------- | ---------------------------- |
| `feature/*` | New features or enhancements |
| `fix/*`     | Bug fixes                    |
| `docs/*`    | Documentation changes        |

Examples:

- `feature/add-timezone-data`
- `fix/incorrect-state-code`
- `docs/update-api-reference`

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Each commit message should be structured as:

```
<type>: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                           |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new feature                                         |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation only changes                            |
| `chore`    | Maintenance tasks (deps, config, etc.)                |
| `test`     | Adding or updating tests                              |
| `refactor` | Code changes that neither fix a bug nor add a feature |

### Examples

```
feat: add population data for cities
fix: correct ISO code for South Korea
docs: add usage examples to README
chore: update dependencies
test: add unit tests for state lookup
refactor: simplify country data decompression
```

## Pull Request Process

1. Ensure your branch is up to date with the `main` branch.
2. Verify that all tests pass before submitting.
3. Fill out the pull request template with a clear description of your changes.
4. Link any related issues using keywords (e.g., `Closes #42`).
5. Request a review from a maintainer.
6. Address any review feedback promptly.
7. Once approved, a maintainer will merge your pull request.

### Pull Request Checklist

- [ ] My code follows the project's code style.
- [ ] I have added or updated tests as needed.
- [ ] All existing tests pass.
- [ ] I have updated documentation if necessary.
- [ ] My commit messages follow the conventional commits format.

## Code Style

This project uses **Prettier** for code formatting and **ESLint** for linting.

- **Prettier** handles formatting automatically. Run it before committing:
  ```bash
  npx prettier --write .
  ```
- **ESLint** catches code quality issues. Run it with:
  ```bash
  npx eslint .
  ```

Key style guidelines:

- Use TypeScript for all source files.
- Prefer named exports over default exports.
- Keep functions small and focused.
- Use descriptive variable and function names.

## Running Tests

This project uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run tests with coverage
npx vitest run --coverage
```

Make sure all tests pass before submitting a pull request.

## Reporting Issues

When reporting an issue, please include:

1. **A clear and descriptive title.**
2. **Steps to reproduce** the issue.
3. **Expected behavior** -- what you expected to happen.
4. **Actual behavior** -- what actually happened.
5. **Environment details:**
   - Node.js version
   - Package version
   - Operating system
6. **Code samples** or error messages, if applicable.

Use the appropriate issue label:

- `bug` -- Something is not working correctly.
- `enhancement` -- A feature request or improvement.
- `documentation` -- Documentation is missing or unclear.
- `question` -- A question about usage or behavior.

Thank you for contributing!
