# Novadent (諾星) — Dental Integration Platform

## Overview
NestJS backend + React/Vite frontend dental industry platform. **Standalone npm project** (NOT pnpm monorepo). The backend serves both the API and the built frontend static files.

## Stack
- **Backend**: NestJS 11 (TypeScript), Drizzle ORM, PostgreSQL
- **Frontend**: React 18 + Vite, TailwindCSS, Framer Motion, Lucide icons
- **Auth**: JWT access token (memory) + refresh token (dual: localStorage + first-party cookie fallback for iframe contexts)
- **File uploads**: GCS object storage (Replit App Storage) with local filesystem fallback, served at `/api/uploads/*`
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
      site-images/        # V1.6: Site image management — full CRUD (banners, homepage bottom, About Us flexible blocks with image/text types, visibility, reorder)
      videos/             # V1.4: YouTube video management (CRUD, publish, featured)
      page-contents/      # V1.4: CMS page contents (terms, privacy, contacts, social)
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
| precision-lab@novadent.com | Lab@2026 | LAB |
| member1@test.com | Member@2026 | MEMBER |

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

## V1.4 Features (Implemented)
- **CMS Module**: 3 new tables (`site_images`, `videos`, `page_contents`) — 21 total tables
- **Site Images**: Admin card-based image manager with HOME/ABOUT tabs, upload support (`/api/site-images`, `/api/admin/site-images/:id`)
- **Videos**: YouTube embed CRUD with publish/featured toggles (`/api/videos`, `/api/admin/videos`)
- **Page Contents**: CMS for terms, privacy, contact info, social links (`/api/page-contents`, `/api/admin/page-contents/:key`)
- **SuperSystemSettings extended**: Sections C (contact info), D (social links), E (legal richtext editor)
- **Collapsible sidebar**: "內容管理" NavGroup groups 文章管理, 通知廣播, 圖片管理, 影音管理
- **Public pages updated**: Videos, Terms, Privacy pages now fetch from CMS APIs; Footer uses CMS contact data
- **XSS protection**: DOMPurify sanitizes CMS richtext content before rendering
- **Auto-seed defaults**: `page_contents` and `site_images` tables seed default rows on first boot

## V1.5 Changes (Mock Data Removal)
- **All MOCK_* constants removed** from App.tsx (~200 lines of hardcoded data deleted)
- **Every page now fetches from real APIs**: KnowledgeCenter→`/api/articles`, Recommendations→`/api/clinics`, Dashboard→`/api/cases`, CaseCreation→`/api/labs`, Overview→`/api/clinics+labs+cases`
- **Hero banner**: Falls back to static image `/S__14336065_0_0.jpg` when no CMS HERO image is uploaded; fetches from `/api/site-images` on mount
- **Paginated API responses handled**: All fetch handlers parse `res.data || res` to handle both paginated `{data, total}` and array responses
- **Null-safe currentCase**: Guards added for `currentCase` (now `Case | null`) in sidebar badge count and LAB overview
- **State cleanup**: Removed unused top-level `clinics`, `labs`, `members`, `articles`, `allCases` state; each component manages its own data

## Deployment
- **Artifact**: `novadent-app` (kind=web, previewPath=`/`)
- **Artifact TOML**: `artifacts/novadent-app/.replit-artifact/artifact.toml`
- **Dev workflow**: `artifacts/novadent-app: web` runs NestJS backend on port 24505
- **Production build**: Builds frontend (`novadent/`) + backend (`novadent/backend/`), then runs NestJS
- NestJS `ServeStaticModule` serves the built frontend from `novadent/dist/`
- SPA fallback: Express middleware in `main.ts` serves `index.html` for all non-API, non-static GET requests
- Client-side routing: `VIEW_PATH_MAP`/`PATH_VIEW_MAP` in `App.tsx` maps all views to URL paths bidirectionally

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `SESSION_SECRET` — Session secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — Mail config (optional)
- `CORS_ORIGINS` — Comma-separated allowed origins (optional)
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` — GCS bucket for file uploads (auto-provisioned)
- `PUBLIC_OBJECT_SEARCH_PATHS` — GCS public asset search paths
- `PRIVATE_OBJECT_DIR` — GCS private object directory
