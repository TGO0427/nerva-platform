# Nerva Platform - Deployment Guide

## Environment Variables

### API (Render / Backend)

```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/nerva_db
JWT_SECRET=<generate-a-64-char-random-string>
NODE_ENV=production

# SMTP (for password reset + email verification)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
SMTP_FROM=noreply@nerva.app
FRONTEND_URL=https://your-web-domain.com

# Error Tracking (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGINS=https://your-web-domain.com
```

### Web (Vercel / Frontend)

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Post-Deploy Checklist

### 1. Run Migrations
Migrations auto-run on API startup. Verify these ran:
- 021: refresh_tokens table
- 022: password_reset_tokens table
- 023: MFA columns (mfa_secret, mfa_enabled)
- 024: Email verification columns

### 2. Setup Sentry
1. Create a Sentry project at https://sentry.io
2. Get your DSN from Project Settings > Client Keys
3. Set `SENTRY_DSN` on both API and Web

### 3. Setup Email (SendGrid recommended)
1. Create a SendGrid account at https://sendgrid.com
2. Create an API key with Mail Send permissions
3. Set SMTP vars on the API service
4. Verify your sender domain for deliverability

### 4. Database Backups
- **Render**: Enable automatic daily backups in the Render dashboard
- **Self-hosted**: Set up pg_dump cron job:
  ```bash
  0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/nerva-$(date +%Y%m%d).sql.gz
  ```
- Retain at least 7 daily + 4 weekly backups
- Test restore procedure monthly

### 5. Monitoring
- Sentry: Set up alerts for new issues and error spikes
- Render: Monitor memory/CPU in the Render dashboard
- Set up uptime monitoring (UptimeRobot, Pingdom, etc.) for:
  - `GET /api/v1/health` (API)
  - `GET /` (Web)

## Docker Deployment (alternative to Render)

```bash
# Create .env with required vars, then:
docker compose -f docker-compose.prod.yml up --build -d

# Check health
curl http://localhost:4000/api/v1/health
curl http://localhost:3000
```

## Running E2E Tests

```bash
pnpm install
npx playwright install chromium
# Start the app first, then:
pnpm test:e2e
```
