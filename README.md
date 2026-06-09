# MediCare GH — Pharmacy POS

A modern pharmacy Point of Sale web application built for Ghana. Manage inventory, process sales in Ghana Cedis (GHS), and view graphical sales reports — all with role-based authentication for admins and cashiers.

## Features

- **Authentication** — Admin and cashier login with JWT-based sessions
- **Point of Sale** — Fast checkout with Cash, Mobile Money (MoMo), and Card payments
- **Inventory Management** — Add, edit, delete products with stock tracking
- **CSV Import** — Bulk import inventory from CSV files
- **Sales Export** — Export sales data to CSV with date filtering
- **Sales Analytics** — Bar charts, line charts, pie charts for revenue visualization
- **Low Stock Alerts** — Dashboard warnings for items running low
- **Animations** — Smooth UI transitions powered by Framer Motion
- **Responsive Design** — Works on desktop and mobile

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Backend  | Node.js, Express                    |
| Database | PostgreSQL with Prisma ORM          |
| Auth     | JWT + bcrypt                        |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) running locally

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the database

Create a PostgreSQL database:

```sql
CREATE DATABASE pharmacy_pos;
```

Copy the environment file and update your connection string:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pharmacy_pos?schema=public"
JWT_SECRET="your-secure-random-string"
PORT=5000
```

### 3. Initialize the database

```bash
npm run db:setup
```

This generates the Prisma client, creates tables, and seeds demo data.

### 4. Start the app

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

## Demo Accounts

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@pharmacy.gh      | admin123    |
| Cashier | cashier@pharmacy.gh    | cashier123  |

## CSV Import Format

Download the template from the Inventory page, or use this format:

```csv
name,sku,category,price,quantity,supplier,description,expiryDate
Paracetamol 500mg,MED-001,Pain Relief,5.00,200,PharmaGh Ltd,,2027-12-31
```

## Project Structure

```
pos--c/
├── backend/
│   ├── prisma/          # Database schema & seed
│   └── src/
│       ├── routes/      # API endpoints
│       ├── middleware/   # Auth middleware
│       └── lib/         # Utilities
├── frontend/
│   └── src/
│       ├── pages/       # Dashboard, POS, Inventory, Sales
│       ├── components/  # Reusable UI components
│       └── context/     # Auth context
└── package.json         # Root scripts
```

## API Endpoints

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | /api/auth/login       | User login           |
| GET    | /api/products         | List products        |
| POST   | /api/products         | Create product       |
| PUT    | /api/products/:id     | Update product       |
| DELETE | /api/products/:id     | Delete product       |
| POST   | /api/products/import  | Import CSV           |
| GET    | /api/sales            | List sales           |
| POST   | /api/sales            | Create sale          |
| GET    | /api/sales/stats      | Sales analytics      |
| GET    | /api/sales/export     | Export sales CSV     |

## License

MIT

## Deployment

### Vercel (recommended)

This monorepo deploys both the frontend and the backend as a single Vercel project. The frontend is built as a static site from `frontend/`, and the backend runs as a serverless function exposed at `/api` (entry point: `api/index.js`, which re-exports the Express app from `backend/src/app.js`).

1. Push your repo to GitHub.
2. On Vercel (https://vercel.com) click **Add New → Project** and import this repository. Vercel auto-detects the static build and the `/api` serverless function.
3. In **Project Settings → Environment Variables**, add:
   - `DATABASE_URL` — connection string to a PostgreSQL database reachable from Vercel (e.g. Neon, Supabase, Railway, or Vercel Postgres). Format: `postgresql://user:password@host:5432/dbname?schema=public`
   - `JWT_SECRET` — a long random string
   - `CLIENT_ORIGIN` — *(optional, only needed for split deployments)* comma-separated list of allowed origins
4. **Important:** Vercel does not provide a database. You must run the Prisma migrations and seed from your local machine using the production `DATABASE_URL` before the first deploy:
   ```bash
   # locally, with backend/.env pointing at the production DB:
   npm run db:setup
   ```
5. Trigger a deployment. After it completes, your app is reachable at `https://<your-project>.vercel.app`, and the API at `https://<your-project>.vercel.app/api/...`.
6. **Verify the DB link** by opening `https://<your-project>.vercel.app/api/health` in your browser. You should see `{"status":"ok","db":"ok",...}`. If `db` is `"error"`, the response's `dbError` field will contain the real Prisma/Supabase error (also visible in **Vercel → Logs**). Common causes: wrong Supabase password, used the direct connection instead of the transaction pooler, or the Supabase project is paused.

Demo accounts after seeding: `admin@pharmacy.gh` / `admin123` and `cashier@pharmacy.gh` / `cashier123`.

### Railway (alternative)

You can deploy this monorepo to Railway with a PostgreSQL plugin, a backend service, and a frontend service.

1. Push your repo to GitHub.
2. On Railway (https://railway.app) click **New Project** → **Deploy from GitHub** and select this repository.
3. Add a PostgreSQL plugin (note the `DATABASE_URL`).
4. Create a backend service:
	- Root directory: `backend`
	- Build command: `npm install`
	- Start command: `npm start`
	- Environment variables: `DATABASE_URL`, `JWT_SECRET` (add a secure value), `CLIENT_ORIGIN` (frontend URL)
5. Create a frontend static service:
	- Root directory: `frontend`
	- Build command: `npm install && npm run build`
	- Publish directory: `frontend/dist`
	- Set `VITE_API_BASE` to your backend URL plus `/api`
6. Set secrets and env vars in the Railway project settings, then trigger deployment.
