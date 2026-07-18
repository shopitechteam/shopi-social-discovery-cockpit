# Shopi Admin Dashboard

Admin dashboard for the Shopi social commerce platform. Next.js 16 + TypeScript + Tailwind v4 + shadcn-style components + Zustand + Apollo Client — the same stack and theming as `shopi-social-commerce-web`.

## Features

- **Login** — staff-only sign-in via the API's `adminLogin` mutation (rejects non-admin accounts). Tokens persist in a Zustand store; expired access tokens refresh transparently through an Apollo error link.
- **Overview** — platform stats (`adminDashboardStats`): users, posts by status, engagement totals, reported posts, plus a live approval-queue preview.
- **Posts** — tabbed by status (Pending / All / Live / Processing / Hidden / Rejected / Removed / Failed) with search and pagination. Actions: approve, reject (with reason emailed to the creator), hide / make live, remove. Row click opens a detail view with video/image preview.
- **Users** — search + role/suspension filters, role management (promote/demote admin, grant creator), suspend/reinstate accounts, create staff accounts.
- **Categories** — tree view of the category hierarchy plus create.

## Getting started

```bash
npm install
cp .env.example .env   # point NEXT_PUBLIC_API_URL at the API
npm run dev            # http://localhost:3001
```

Bootstrap the first admin account from the API repo with `npm run make:admin`, then sign in with that account's email + password.

## API surface used

Existing: `adminLogin`, `adminCreateAccount`, `refreshToken`, `logout`, `pendingApprovalContent`, `approveContent`, `rejectContent`, `setContentLive`, `categories`, `createCategory`.

Added to the API for this dashboard (module `src/modules/admin/`): `adminDashboardStats`, `adminContent`, `adminUsers`, `adminRemoveContent`, `adminUpdateUserRoles`, `adminSetUserSuspended` — all `@Authorized(ADMIN)`.
