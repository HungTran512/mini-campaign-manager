# Campaign Manager — Full-stack

Interview submission: **Yarn workspaces** monorepo. From **`CampaignManager/`** (this folder), run `yarn install` to install **`CampaignManagerAPI`** and **`CampainManagerFE`**.

| Package | Stack | Role |
|---------|--------|------|
| **`CampaignManagerAPI/`** | Node.js **Express**, **PostgreSQL** (`pg` + raw SQL), **Zod**, SQL migrations, **JWT** in an **httpOnly** session cookie | REST API |
| **`CampainManagerFE/`** | **Vite**, React 18, TypeScript, **Redux Toolkit**, **TanStack Query**, Tailwind, React Hook Form + Zod | SPA |

**Prerequisites:** Node **≥ 20**, **Yarn 1.x**, **Docker** (optional, for Compose). See each package’s `package.json` for scripts.


---

## Local setup (Docker)

Requires [Docker](https://docs.docker.com/get-docker/) with Compose v2. Run from **`CampaignManager/`** (where `docker-compose.yml` lives):

```bash
docker compose up --build
```

This starts **PostgreSQL 16** and the **API** on **http://localhost:8000**. On API container start: **`db:create`** (if needed), **`migrate`**, **`seed:demo`**, then **`npm run start`**.

**Demo account (after seed):** `demo@example.com` / `demo12345` — sample campaigns (draft, scheduled, sent) and recipients.

**Frontend** (on the host for Vite HMR):

```bash
yarn install
cd CampainManagerFE && cp .env.example .env
# VITE_API_URL=http://localhost:8000
cd .. && yarn dev:fe
```

| Command | Purpose |
|---------|---------|
| `docker compose up --build` | Postgres + API |
| `yarn seed:demo` | Re-seed (needs **`DATABASE_URL`** in **`CampaignManagerAPI/.env`**) |
| `yarn migrate` | SQL migrations only |

Volume **`campaign_pgdata`** persists Postgres data. Full reset: `docker compose down -v` then `docker compose up --build` again.

---

## Local setup (Yarn only)

### 1. Install

```bash
cd CampaignManager   # this repo root
yarn install
```

### 2. Database & API

```bash
cd CampaignManagerAPI
cp .env.example .env   # DATABASE_URL, JWT_SECRET, CORS_ORIGIN=http://localhost:5173
yarn run db:create
yarn run migrate
yarn run seed:demo     # optional
```

From **`CampaignManager/`**:

```bash
yarn dev:api
yarn migrate
yarn test
```

### 3. Frontend

```bash
cd CampainManagerFE
cp .env.example .env   # VITE_API_URL=http://localhost:3000 when API runs via yarn dev:api
```

From **`CampaignManager/`**:

```bash
yarn dev:fe
```

**Root scripts:** `yarn dev:api`, `yarn dev:fe`, `yarn build`, `yarn lint`, `yarn test`, `yarn migrate`, `yarn seed:demo`, `yarn docker:up` (same as `docker compose up --build`).


---

## Database schema (ER)

Source of truth: **`CampaignManagerAPI/migrations/001_init.sql`**, indexes: **`002_indexes.sql`**.

```mermaid
erDiagram
  users ||--o{ campaigns : "created_by"
  users ||--o{ campaigns : "updated_by"
  campaigns ||--o{ campaign_recipients : "has"
  recipients ||--o{ campaign_recipients : "in"

  users {
    uuid id PK
    citext email UK
    text name
    text password_hash
    timestamptz created_at
  }

  campaigns {
    uuid id PK
    text name
    text subject
    text body
    enum campaign_status status
    timestamptz scheduled_at
    uuid created_by FK
    timestamptz created_at
    timestamptz updated_at
    uuid updated_by FK
    timestamptz deleted_at
  }

  recipients {
    uuid id PK
    citext email UK
    text name
    timestamptz deleted_at
    timestamptz created_at
  }

  campaign_recipients {
    uuid campaign_id PK_FK
    uuid recipient_id PK_FK
    timestamptz sent_at
    timestamptz opened_at
    enum campaign_recipient_status status
  }
```

PostgreSQL: types **`campaign_status`**, **`campaign_recipient_status`** (`CREATE TYPE … AS ENUM`). Diagram uses `enum` labels for readability.

## How I Used Claude Code

**I used AI as a productivity multiplier, not a decision maker.**

### What I delegated

- Scaffolding Express routes and React components  
- Repetitive CRUD-style handlers  
- React Hook Form + Zod wiring  
- First drafts of SQL and tests  

### Example prompt

> Generate an Express route for `POST /campaigns` that inserts a campaign and returns it.  
> Assume PostgreSQL and a `userId` from middleware.  
> Do not include business rules.

### What I reviewed and corrected

- Inefficient stats SQL → **aggregation**  
- Edge cases (e.g. **duplicate recipients**)  
- **Business rules** and **404 vs 409** style errors  

### What I did NOT delegate

| Area | Why |
|------|-----|
| **Database schema & indexes** | Relationships and query paths |
| **Business rules** | Draft-only edits, scheduling, send semantics |
| **API shape & status codes** | REST consistency |
| **Authentication** | Cookie + JWT behavior |

## Evaluation crosswalk

| Lens | Evidence |
|------|----------|
| Backend | SQL constraints, service rules, `yarn test` |
| API | REST resources, auth on protected routes |
| Frontend | Routing, forms, React Query, error/loading UX |
| AI collaboration | Section above |
