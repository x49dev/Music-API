# Contributing to Music API

Thank you for your interest in contributing to Music API! This guide will help you get started.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing. We expect all contributors to follow it.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, check [existing issues](https://github.com/x49dev/Music-API/issues) to see if the problem has already been reported.

When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Your environment (OS, Node.js version, npm version)
- Any relevant logs or error messages

### Suggesting Features

Feature requests are welcome. Please open an issue with:

- A clear description of the proposed feature
- The use case it solves
- Any implementation ideas you have

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write or update tests
5. Ensure all checks pass
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 22+
- npm
- yt-dlp ([installation guide](https://github.com/yt-dlp/yt-dlp#installation))

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/x49dev/Music-API.git
cd music-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Available Scripts

| Script               | Description                      |
| -------------------- | -------------------------------- |
| `npm run dev`        | Start dev server with hot-reload |
| `npm run build`      | Compile TypeScript               |
| `npm run start`      | Run compiled application         |
| `npm run lint`       | Check code with ESLint           |
| `npm run lint:fix`   | Auto-fix lint issues             |
| `npm run format`     | Format code with Prettier        |
| `npm run test`       | Run tests                        |
| `npm run test:watch` | Run tests in watch mode          |

### Docker Development

```bash
docker compose up
```

This starts the app with PostgreSQL and Redis, with hot-reload enabled.

## Pull Request Process

### Before You Start

1. Check [existing issues](https://github.com/x49dev/Music-API/issues) to see if your change is already being discussed
2. For significant changes, open an issue first to discuss the approach
3. Keep pull requests focused on a single change

### While Working

1. Follow the existing code style (ESLint + Prettier are configured)
2. Write tests for new functionality
3. Keep commits focused and atomic
4. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

### Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint. Format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:

```
feat(search): add pagination support
fix(provider): handle yt-dlp timeout errors
docs(readme): update installation guide
test(tracks): add integration tests for track endpoint
chore(deps): update dependencies
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`, `ci`

### Submitting

1. Push your branch to your fork
2. Open a pull request against `main`
3. Fill out the PR template
4. Ensure CI passes
5. Wait for review

### Code Review

- Maintainers will review your PR
- Address any feedback
- Once approved, a maintainer will merge your PR

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use type imports where possible

### Code Style

- ESLint and Prettier are configured
- Run `npm run lint:fix` and `npm run format` before committing
- Hooks run automatically via Husky

### Testing

- Write tests for new functionality
- Include both happy path and error cases
- Use Vitest for unit and integration tests
- Mock external services (yt-dlp, YouTube API) in tests

### Architecture

- Follow existing patterns in the codebase
- Keep functions small and focused
- Use meaningful variable and function names
- Add types to function signatures

## Project Structure

```
src/
  api/         # Route handlers
  cache/       # Cache implementations
  config/      # Configuration
  db/          # Database schema and repositories
  errors/      # Error classes
  middleware/  # Fastify middleware
  providers/   # Provider implementations
  schemas/     # JSON Schema definitions
  services/    # Business logic
```

## Getting Help

- Check [existing documentation](docs/)
- Open a [discussion](https://github.com/x49dev/Music-API/discussions) for questions
- Open an [issue](https://github.com/x49dev/Music-API/issues) for bugs

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
