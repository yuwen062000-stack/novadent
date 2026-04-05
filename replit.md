# Novadent (諾星) — Dental Integration Platform

## Overview
NestJS backend + React/Vite frontend dental industry platform. **Standalone npm project** (NOT pnpm monorepo). The backend serves both the API and the built frontend static files.

## Stack
- **Backend**: NestJS 11 (TypeScript), Drizzle ORM, PostgreSQL
- **Frontend**: React 18 + Vite, TailwindCSS, Framer Motion, Lucide icons
- **Auth**: JWT access token (memory) + HttpOnly refresh cookie
- **File uploads**: Local storage at `{cwd}/../uploads/`, served at `/api/uploads/*`
- **Email**: Nodemailer (MailService, configurable via SMTP env vars)

## Project Structure
```
novadent/
  src/                    # Frontend React source
    pages/admin/          # Admin pages (Dashboard, Users, Clinics, Labs, Articles, NotificationCMS)
    pages/super/          # SuperAdmin pages (SystemSettings, AuditLogs, QAQuestions, MfgTemplates, MenuManager)
    pages/member/         # Member pages (QAWizard, Recommendations, CaseTracking, Settings)
    pages/clinic/         # Clinic pages (CaseList, CreateCase, CaseDetail with assign-lab)
    pages/lab/            # Lab pages (CaseList, CaseDetail with step updates)
    pages/shared/         # Shared pages (Notifications, AccountMgmt)
    services/authService.ts  # API client (apiFetch with /api prefix)
    components/auth/      # Login, ForgotPassword, ResetPassword, ForceChangePassword
  dist/                   # Built frontend (served by NestJS ServeStaticModule)
  backend/
    src/
      auth/               # JWT auth module (login, refresh, change-password, forgot-password)
      users/              # User CRUD + toggle-status + reset-password
      clinics/            # Clinic module (public, user, admin controllers)
      labs/               # Lab module (user, admin controllers)
      cases/              # Case management with MFG steps
      consultations/      # QA consultation module
      notifications/      # Notifications module
      articles/           # Articles module (public + admin)
      admin/              # Admin dashboard stats, partner links, menu config, broadcast
      system-settings/    # V1.3: SuperAdmin system settings CRUD
      mail/               # V1.3: Nodemailer mail service
      upload/             # File upload with multer
      qa-questions/       # QA question templates
      mfg-step-templates/ # Manufacturing step templates
      database/schema.ts  # Drizzle schema (all tables)
    dist/                 # Built backend
```

## Key Commands
```bash
# Frontend build
cd novadent && npm run build

# Backend build (must use NODE_ENV=development for devDeps)
cd novadent/backend && NODE_ENV=development ./node_modules/.bin/nest build

# Backend install (legacy peer deps required)
cd novadent/backend && NODE_ENV=development npm install --legacy-peer-deps

# DB schema push
cd novadent/backend && npx drizzle-kit push

# Run (production)
cd novadent/backend && NODE_ENV=production node dist/src/main.js
```

## API Conventions
- All controllers use `@Controller('api/...')` prefix — no global prefix in main.ts
- Frontend `apiFetch()` automatically prepends `/api` — use paths like `/auth/me`, `/admin/clinics`
- CORS: Allowlist based (REPLIT_DEV_DOMAIN, REPLIT_DOMAINS, CORS_ORIGINS env var)

## Test Accounts
| Email | Password | Role |
|---|---|---|
| superadmin@novadent.com | SuperAdmin123! | SUPER_ADMIN (force change pw) |
| admin@novadent.com | Admin@2026 | ADMIN |
| taipei-clinic@novadent.com | Clinic@2026 | CLINIC |
| seiko-lab@novadent.com | Lab@2026 | LAB |
| member@novadent.com | Member@2026 | MEMBER |

## V1.3 Features (Implemented)
- **SystemSettings module**: CRUD at GET/PUT `/api/admin/system-settings` (SUPER_ADMIN only)
- **MailService**: Nodemailer-based, wired to forgot-password flow
- **Broadcast notifications**: POST `/api/admin/notifications/broadcast` with target role selection
- **Admin UI improvements**: User edit modal, clinic/lab disable/enable toggle, article delete + tags
- **Clinic assign-lab UI**: Built into ClinicCaseDetail page with SearchableSelect
- **MemberSettings**: Password change form
- **INSURER framework**: Basic sidebar + customer management placeholder
- **SuperSystemSettings**: Admin page for managing platform settings
- **User registration**: POST `/api/auth/register` — creates MEMBER account, auto-login
- **QA questionnaire fix**: Options store both label+value; submit maps Q1→q1Answer, Q4→q2City
- **City-based recommendations**: MemberRecommendations uses `/consultations/:id/recommendations` API (filters by city)
- **Admin clinic city dropdown**: City field uses dropdown matching questionnaire cities (台北市~高雄市 + all counties)
- **SearchableSelect component**: Reusable searchable dropdown (`components/ui/SearchableSelect.tsx`), used in AdminPartnerLinks and ClinicCaseDetail

## Deployment
- **Artifact**: `novadent-app` (kind=web, previewPath=`/`)
- **Artifact TOML**: `artifacts/novadent-app/.replit-artifact/artifact.toml`
- **Dev workflow**: `artifacts/novadent-app: web` runs NestJS backend on port 24505
- **Production build**: Builds frontend (`novadent/`) + backend (`novadent/backend/`), then runs NestJS
- NestJS `ServeStaticModule` serves the built frontend from `novadent/dist/`

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `SESSION_SECRET` — Session secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Mail config (optional)
- `CORS_ORIGINS` — Comma-separated allowed origins (optional)
