# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Music API, please contact the maintainer via [Telegram](https://t.me/PandaonTG/). All security vulnerabilities will be promptly addressed.

**Please do NOT report security vulnerabilities through public GitHub issues.**

### What to include

When reporting a vulnerability, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if you have one)

### What to expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours.
- **Assessment**: We will assess the vulnerability and determine its impact.
- **Fix**: We will work on a fix and release it as soon as possible.
- **Disclosure**: We will coordinate with you on the timing of public disclosure.

## Security Best Practices

When deploying Music API, follow these security best practices:

### Environment Variables

- Never commit `.env` files to version control
- Use environment-specific secrets for production
- Rotate API keys and secrets regularly
- Use strong, unique passwords for database and Redis

### Network Security

- Use HTTPS in production
- Configure firewall rules to restrict access
- Use a reverse proxy (e.g., Nginx) for TLS termination
- Restrict database and Redis access to application network only

### Dependencies

- Keep dependencies up to date
- Review security advisories regularly
- Use `npm audit` to check for known vulnerabilities
- Dependabot is configured for automated security updates

### Docker

- Use the non-root user (already configured in the Dockerfile)
- Keep base images updated
- Scan images for vulnerabilities
- Use multi-stage builds to minimize attack surface

### API Security

- Rate limiting is enabled by default
- Input validation is applied to all endpoints
- CORS is configured appropriately
- Security headers are set via Helmet

## Contact

For any security concerns, please contact the maintainers through:

- GitHub Issues (for non-sensitive matters only)
- [Telegram](https://t.me/PandaonTG/) (for security vulnerabilities)
