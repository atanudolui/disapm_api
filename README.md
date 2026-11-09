# Authentication API

NestJS API for the Puja Readiness Portal frontend. It uses PostgreSQL through
TypeORM, hashes passwords with bcrypt, issues short-lived JWTs, and stores each
token in an HttpOnly cookie.

## Setup

Start a PostgreSQL server and create a database (the default connection string
assumes a local database named `project1`). Then configure the API:

```bash
npm install
cp .env.example .env
```

Update `DATABASE_URL` in `.env` to match your PostgreSQL host, database, and
credentials. Set `JWT_SECRET` to a random value of at least 32 characters; for
example, generate one with `openssl rand -base64 48`.

Start the API:

```bash
npm run start:dev
```

Schema synchronization and automatic migration execution on startup are
disabled. Apply pending SQL migrations separately before deploying an API
version that depends on them. The API listens on `http://localhost:3001`. Set
`FRONTEND_ORIGIN` if the frontend runs at a different origin. The frontend
defaults to this API URL; override it by setting `NEXT_PUBLIC_API_URL` before
starting Next.js.
The API allows credentialed CORS requests from the production frontend domains
`https://disapm-prod.up.railway.app` and `https://disapm.in`. Set
`FRONTEND_ORIGIN` to add any other allowed origins; multiple origins can be
comma-separated.

Public registration is disabled. After the API has started and run its
migrations, create the first administrator from a second interactive terminal.
The password is entered without being echoed:

```bash
npm run user:create -- administrator "System Administrator"
```

Sign in with the username and password. Existing users receive a unique
username from their previous account name during migration. Only administrators can access the
Users module and its API. The API checks the user's current database role on
every Users request, so role changes take effect immediately. New accounts
default to the `user` role; roles are `user` and `admin`.

To populate a local development database with 10 dummy ghats and 10 sample
user accounts, run `npm run seed:sample-ghats`. The command only connects to a
database hosted on the local computer, is safe to rerun, and prints generated
passwords once for newly created sample users.

Set `TEST_DATABASE_URL` to a separate PostgreSQL test database before running
the end-to-end tests, so test data is kept apart from development data.

## Endpoints

- `POST /auth/login` — authenticate with `{"username":"...","password":"..."}` and set the JWT cookie
- `POST /auth/logout` — clear the JWT cookie
- `GET /auth/me` — return the authenticated user; requires the JWT cookie or a
  bearer token
- `GET /users` — list users; requires an administrator JWT cookie or bearer token
- `POST /users` — create a user; requires an administrator JWT cookie or bearer token;
  body: `{"username":"...","name":"...","password":"...","role":"user|admin"}` (role optional);
  usernames are case-insensitively unique
- `PATCH /users/:id` — update username, name, password, and/or role; requires an administrator
- `DELETE /users/:id` — delete a user; requires an administrator; self-deletion is rejected
- `GET /ghats` — list ghats and inspection history; requires authentication
- `GET /ghats/:id` — get ghat details and inspections
- `POST /ghats` — register a river or pond ghat with district, sub-division,
  block and designated Nodal Officer
- `PATCH /ghats/:id` / `DELETE /ghats/:id` — update or remove a ghat; deleting
  also removes its inspection history
- `GET /ghats/:id/inspections` — list inspections
- `POST /ghats/:id/inspections` — record a joint inspection, readiness
  checklist and deficiency actions
- `PATCH /inspections/:id` — update an inspection and deficiency rectification
- `GET /reports/action-taken?orderDate=YYYY-MM-DD` — generate an Action Taken
  Report summary (defaults to the 2026-10-29 order date)

Inspections record a festival or occasion (Durga Puja, Kali Puja, or Chhat
Puja), its start and end dates, and required latitude and longitude
coordinates. Up to two JPEG, PNG, or WebP photos (2 MB each) can be attached
to each inspection; photo data is stored in PostgreSQL. The checklist separately assesses approach
roads/pathways maintained, ghat lighting/backup power, crowd management,
safety, police and women police deployment, CCTV and public address, rescue teams, public
amenities, emergency response, and cleanliness and upkeep. The public
amenities assessments separately cover drinking water/sanitation and women’s
changing facilities/signage. Each assessment is Ready, Pending, or Not
applicable. The report deadline is calculated as seven days after the order
date.
Ghats and inspections are available to authenticated users; user
administration remains administrator-only.

Passwords must contain at least 8 characters and fit within bcrypt's 72-byte
limit. Authentication endpoints are rate-limited. JWT access cookies are
HttpOnly, SameSite=Strict, and expire after 15 minutes. Production cookies use
the Secure attribute.

The login page supports sign-in only. The dashboard loads the current user from
the protected profile endpoint, redirects to sign-in when the session is
missing, and links to the authenticated Users module for listing, creating,
editing, and deleting users. For production, use HTTPS and a managed PostgreSQL
database, and configure the JWT secret and frontend origin through the
deployment environment.
