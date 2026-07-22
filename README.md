# oyrenoyret.org
<!-- latest repository refresh -->

A production-grade, security-first learning platform I’m building for students, teachers, and parents - built with Next.js, TypeScript, and PostgreSQL.
(Note:) This project has been built as a social responsibility project for HZT (Haji Zeynalabdin Taghiyev) Competition. However, we are independently running this project to promote education in Azerbaijan and diverge the educational gap between priviliged and underpriviliged classes.

## What it includes

- Curriculum and learning materials (text + practice tests)
- Events (guided sessions, sprints, contests) with registration, countdowns, and winners
- Discussions, notifications, and moderation tools
- Roles and admin workspace, plus consent tracking for minors
- Credits/points and progress tracking

## 🏗️ Architecture

This platform follows a **modular, domain-driven design** with clear separation of concerns:

- **app/**: Next.js App Router - routing layer only (minimal logic)
- **src/core/**: Platform engine (interaction models, records, credits)
- **src/modules/**: Domain modules (users, sessions, consent, reports)
- **src/services/**: External integrations (db, email, auth)
- **src/db/**: Prisma client + repositories
- **src/lib/**: Shared utilities (validation, permissions, security)
- **src/config/**: Centralized rules/constants
- **src/types/**: Global TypeScript types
- **src/security/**: Security utilities

## 🛠️ Tech Stack

- **Next.js 16** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (design system)
- **PostgreSQL** (via Prisma ORM)
- **shadcn/ui** (component library)

## 🔒 Security Features

- Secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- CSRF protection utilities
- Rate limiting utilities
- Input validation with Zod
- Secure token generation
- Server-only database access
- Parental consent tracking

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- Docker Desktop (the recommended development database)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (see `.env.example`) and set at minimum:
   - `NEXTAUTH_SECRET` (32+ chars)

   The next command creates an ignored `.env.local` containing the development-only database connection. It refuses to overwrite a different database target.

3. Start the dedicated local PostgreSQL container:
   ```bash
   npm run db:docker:up
   ```

   The development database listens only on `127.0.0.1:5434`, stores its data in a Docker volume, and is selected by the ignored `.env.local` file. It does not use or modify remote databases.

4. Apply the committed migrations:
   ```bash
   npx prisma migrate deploy
   ```

5. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

Use `npm run db:docker:down` to stop the database without deleting its data. Docker volume deletion is intentionally not included in a project script.

## 📁 Project Structure

```
/
├── app/                    # Next.js App Router routes
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # User dashboard
│   ├── parent/            # Parent portal
│   ├── admin/             # Admin portal
│   └── api/               # API routes
│
├── src/
│   ├── core/              # Platform engine
│   ├── modules/           # Domain modules
│   │   ├── users/
│   │   ├── sessions/
│   │   ├── consent/
│   │   └── reports/
│   ├── services/          # External integrations
│   ├── db/                # Prisma client
│   ├── lib/               # Shared utilities
│   ├── config/            # Configuration
│   ├── types/             # Global types
│   └── security/          # Security utilities
│
├── prisma/
│   └── schema.prisma      # Database schema
│
└── components/
    └── ui/                # shadcn/ui components
```

## 🗄️ Database

The platform uses Prisma ORM with PostgreSQL. Key models:

- **User**: User accounts with roles (STUDENT, PARENT, ADMIN, TEACHER)
- **ParentalConsent**: Consent tracking for minors
- **Session**: Learning session tracking
- **AcademicRecord**: Academic progress records

### Database Commands

- Generate Prisma client: `npm run db:generate`
- Create migration: `npm run db:migrate`
- Open Prisma Studio: `npm run db:studio`
- Push schema changes: `npm run db:push`

## 🎨 Design System

Design aims for an academic, calm, and trustworthy experience.

## 🔐 Security Best Practices

1. **Never expose secrets to the client**
2. **Validate all inputs server-side**
3. **Use environment variables for sensitive data**
4. **Implement rate limiting on all API routes**
5. **Use CSRF protection for state-changing operations**
6. **Store parental consent with version tracking**
7. **Never store sensitive documents directly**

### Rate Limiting (Upstash Redis)

Rate limiting is implemented server-side. In production, configure Upstash Redis to enforce limits consistently across multiple server instances:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 📝 Development Guidelines

- **TypeScript strict mode**: All code must pass strict type checking
- **Modular design**: Modules should be isolated and removable
- **Security first**: All features must consider security implications
- **Clean code**: Small, focused files with clear naming
- **Comments explain WHY**: Code should be self-documenting

## 🚀 Deployment

Use the mandatory [deployment readiness runbook](docs/DEPLOYMENT_READINESS.md) before changing a staging or production database.

1. Set production environment variables
2. Run database migrations (`npx prisma migrate deploy`)
3. Build the application: `npm run build`
4. Start the server: `npm start`

### Vercel

This repo includes a Vercel-specific build script (`npm run vercel-build`) and a `vercel.json` that sets it as the build command. The script:

- runs `prisma migrate deploy` with retries for transient database connection errors
- validates production configuration and fails the build if validation or migrations fail

If your Vercel Project Settings override the build command, set **Build Command** to `npm run vercel-build` (and remove any `npx prisma migrate deploy && ...` build command).

Security note:
- Mark secrets (DB URLs, API keys, tokens) as **Sensitive** in Vercel so their values are not visible in the dashboard.
- Rotate at the source if a value may have been shared (create a new DB password/user, new API key, new R2 key, etc), then update Vercel to the new value.
- Never store secrets in `NEXT_PUBLIC_*` variables (those are exposed to the browser bundle).

## 🖼️ User Uploads (Cloudflare R2)

This project uploads user images directly to Cloudflare R2 using short-lived presigned `PUT` URLs (no server filesystem writes).

**Required env vars**

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET`

The bucket must remain private. Upload responses expose only same-origin proxy URLs; student sprint files additionally require ownership or an admin/teacher role to read.

**Bucket CORS (required for browser uploads)**

In R2 bucket settings, add a CORS rule that allows `PUT` from your app origin(s). Example:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com", "https://www.your-domain.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "cache-control", "x-amz-meta-expected-size", "x-amz-meta-uploaded-by"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Optional:
- `R2_PRESIGN_TTL_SECONDS` (default `300`, min `30`, max `900`)
- `R2_DISCUSSIONS_PREFIX`, `R2_ANNOUNCEMENTS_PREFIX`, `R2_SPRINT_SUBMISSIONS_PREFIX`

Apply object lifecycle rules to remove abandoned presigned uploads. The application rejects objects whose actual size or signed metadata does not match the upload request, but lifecycle cleanup is still required to reclaim unusable objects.

## Security checks

- `npm run security:scan` checks tracked and unignored files for common credential formats and forbidden credential files.
- `npm run security:audit` fails on high-severity production dependency advisories.
- `npm run env:check` validates production secrets, trusted origins, private storage, distributed rate limiting, and TLS settings without printing values.
- `npm run typecheck`, `npm run lint`, and `npm run build` provide static and build-time verification.

The `20260722000000_security_hardening` migration invalidates existing login sessions and guardian codes because legacy rows stored those credentials in plaintext. Users must sign in again and request a new guardian code after deployment. The migration also adds credit-ledger idempotency constraints; if historical duplicate ledger entries exist, deployment intentionally stops so they can be reconciled rather than silently deleting financial history.

## 📄 License

This repository does not currently publish a license file.
