# AppointMePro

Full-stack booking platform for independent professionals to manage appointments, services, and client scheduling with enterprise-grade security and modern UX patterns.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql)](https://postgresql.org/)

**Live Demo:** [https://www.appointmepro.me/](https://www.appointmepro.me/)

---

## About the Project

AppointMePro is a production-ready SaaS platform that enables independent professionals (stylists, therapists, consultants) to manage their business operations through a secure admin dashboard while providing clients with an intuitive booking experience. It solves the problem of expensive enterprise booking systems by delivering RBAC, JWT authentication, real-time availability validation, and multi-service cart functionality at indie-friendly deployment costs.

Solo full-stack project covering architecture design, development, testing, and production deployment.

**Target Users:**
- **Professionals:** Manage services, weekly schedules, availability blocks, and bookings through a mobile-first admin panel
- **Clients:** Browse services by category, book multiple appointments in a single session with real-time availability checks

---

## Architecture & Tech Stack

```
Frontend (Vite + React 19)          Backend (Express.js)              Database
+---------------------------+       +--------------------------+      +------------------+
| Pages / Routes            |       | Routes (validation)      |      | PostgreSQL 17    |
| Components (shadcn-ui)    |------>| Controllers (business)   |----->| Prisma ORM       |
| Zustand Stores (state)    |       | Services (data layer)    |      | 7 tables         |
| Axios HTTP Client         |       | Passport.js Auth         |      +------------------+
+---------------------------+       +--------------------------+
```

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 | Runtime environment |
| TypeScript | 5.7.3 | Type safety, developer experience |
| Express.js | 4.21 | HTTP server, routing |
| Prisma | 5.22 | Type-safe ORM, migrations |
| PostgreSQL | 17 | Relational database (Supabase) |
| Passport.js | 0.7 | Authentication strategies |
| passport-jwt | 4.0.1 | JWT strategy for Passport.js |
| bcryptjs | 3.0 | Password hashing (10 rounds) |
| cookie-parser | 1.4.7 | Cookie parsing for HttpOnly JWT |
| cors | 2.8.5 | Cross-Origin Resource Sharing |
| Helmet | 8.1 | Security headers |
| pino | 9.11.0 | Structured production logging |
| date-fns | 4.1.0 | Date manipulation and timezone utilities |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI library with latest features |
| TypeScript | 5.9.3 | Type safety across codebase |
| Vite | 7.3.3 | Build tool, HMR, optimizations |
| TailwindCSS | 4.1.18 | Utility-first CSS framework |
| shadcn/ui | - | Component collection built on Radix UI |
| Radix UI | 1.2.4 | Accessible UI primitives |
| Zustand | 5.0.9 | State management |
| React Router | 7.12.0 | Client-side routing |

### DevOps & Deployment

| Tool | Purpose |
|------|---------|
| Vercel | Frontend hosting (CDN, edge functions) |
| Render | Backend hosting (auto-deploy from Git) |
| Supabase | PostgreSQL hosting (managed backups) |
| pnpm | Fast, disk-efficient package manager |
| pnpm workspaces | Monorepo orchestration for shared codebase |

---

## Key Features

### Admin Panel

- Service CRUD with global category system and pricing management
- Weekly base schedule configuration with one-off availability blocks
- Real-time booking dashboard with client contact information and date filtering
- Contact info and business location settings (phone, email, address, map coordinates)
- Secure authentication with JWT HttpOnly cookies and role-based access control

### Client Experience

- Category-filtered service discovery with pagination
- Multi-service shopping cart with total duration and price calculation
- Dual authentication: email/password registration with verification + Google OAuth
- Real-time availability validation with conflict detection during booking
- Transactional email delivery via Resend API (verification, confirmation)

---

## Security & Best Practices

### Authentication & Authorization

- JWT stored in HttpOnly cookies (`access_admin_token` / `access_client_token`) with `sameSite: 'lax'`
- Separate Passport.js strategies for admin and client authentication flows
- Role-Based Access Control (RBAC) at both frontend route level and backend middleware level
- Session invalidation on role switch to prevent concurrent access conflicts

### Security Implementation

- bcrypt password hashing with 10 rounds and salt
- CORS restricted to configured `CLIENT_URL` environment variable
- Helmet.js security headers middleware
- Prisma ORM parameterized queries (SQL injection prevention)
- Email verification tokens with expiration (24h)
- Password reset token flow with secure expiration

### Code Quality

- TypeScript strict mode enabled across both frontend and backend
- Zero `any` types enforced via ESLint rules
- Discriminated unions for type-safe auth state management
- Clean architecture pattern: routes -> controllers -> services -> Prisma
- SOLID principles applied throughout the codebase

### Testing

- 21 test files in backend (unit + integration tests with Vitest + supertest)
- 10 test files in frontend (unit tests with Vitest + @testing-library/react)
- Test coverage for auth flows, booking validation, availability conflict detection, timezone conversion utilities

---

## Project Structure

```
AppointMePro/
├── backend/src/
│   ├── controllers/          # Request/response handling
│   ├── routes/               # Route definitions with middleware
│   ├── services/             # Business logic layer
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (7 models)
│   │   └── seed.js           # Sample data seeding
│   └── tests/                # Unit + integration tests
├── frontend/src/
│   ├── components/           # shadcn-ui and custom UI components
│   ├── pages/                # Route-based page components
│   ├── stores/               # Zustand state management
│   ├── lib/                  # Utility functions (timezone, calendar)
│   └── tests/                # Unit tests with testing-library
├── pnpm-workspace.yaml       # Monorepo configuration
└── package.json              # Root scripts (dev, build, lint, test)
```

---

## Getting Started

### Prerequisites

- Node.js v20+
- pnpm v9+
- PostgreSQL v17+ (or Supabase account)
- Git

### Quick Setup

```bash
git clone https://github.com/RodrigoNaray/AppointMePro.git
cd AppointMePro
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cd backend && npx prisma migrate dev && npx prisma db seed && pnpm create:admin
cd .. && npm run dev
```

---

## Challenges Faced

- **Cross-Session Authentication:** RBAC route guards (`AdminRoute`, `ClientRoute`) plus backend cookie invalidation on role switch to prevent privilege escalation after logout
- **Safari iOS Cookies:** Migrated from `sameSite: 'strict'` to `'lax'` to resolve cross-site cookie blocking on Safari mobile
- **Booking Conflicts:** Atomic Prisma transaction with `findFirst()` + `create()` and database-level unique constraints to prevent double-booking

---

## Author

**Rodrigo Naray** — [GitHub](https://github.com/RodrigoNaray) | [LinkedIn](https://www.linkedin.com/in/rodrigonaray/)
