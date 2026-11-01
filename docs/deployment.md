# Deploying Dishviz: Vercel (Frontend) & Render (Backend)

This guide provides complete instructions for deploying the separated frontend and backend to **Vercel** and **Render** respectively.

```
┌────────────────────────────────────────┐         ┌────────────────────────────────────────┐
│               FRONTEND                 │         │                BACKEND                 │
│                Vercel                  │  HTTPS  │                 Render                 │
│         https://app.vercel.app         │◄───────►│       https://api.onrender.com         │
│  - React 18 + Vite SPA                 │  JSON   │  - Node.js + Express API               │
│  - Client routing via vercel.json      │  Files  │  - Prisma ORM + DB (SQLite/Postgres)   │
│  - model-viewer 3D AR runtime          │         │  - 3D Generation Pipeline              │
└────────────────────────────────────────┘         └────────────────────────────────────────┘
```

---

## Part 1: Deploy Backend to Render

1. **Push your code to GitHub / GitLab**.
2. Log in to [dashboard.render.com](https://dashboard.render.com).
3. Click **"New"** > **"Web Service"** (or use the Blueprint from `backend/render.yaml`).
4. If deploying from a monorepo, set **Root Directory** to `backend`.
5. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install --include=dev && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
6. Add the following **Environment Variables**:
   - `NODE_ENV` = `production`
   - `FRONTEND_ORIGIN` = `https://your-frontend-name.vercel.app` *(update this after creating your Vercel project)*
   - `DATABASE_URL` = `file:./prod.db` *(or use Render's managed PostgreSQL)*
   - `JWT_SECRET` = *(click "Generate" or provide a 32+ character random string)*
   - `COOKIE_CROSS_SITE` = `true` *(ensures cookies work across vercel.app and onrender.com)*
   - `AR_PROVIDER` = `unconfigured` *(or `tripo3d` when using a Tripo3D API key)*
   - `AR_PROVIDER_API_KEY` = *(your Tripo3D key from platform.tripo3d.ai, if using tripo3d)*
   - `STORAGE_PROVIDER` = `local` *(or `s3` for AWS S3 / Cloudflare R2)*
   - `STORAGE_LOCAL_PATH` = `./uploads`
   - `MASTER_INTERNAL_SECRET` = *(click "Generate" — used for private first-party ingestion)*
7. Click **"Deploy Web Service"**.
8. Once deployed, copy your Render service URL: `https://your-backend-name.onrender.com`.

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New"** > **"Project"** and select your repository.
3. If deploying from a monorepo, set **Root Directory** to `frontend`.
4. Configure Build Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add the **Environment Variable**:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-name.onrender.com` *(your Render URL from Part 1, without a trailing slash)*
6. Click **"Deploy"**.
7. Once deployed, copy your live Vercel domain: `https://your-frontend-name.vercel.app`.

---

## Part 3: Connect Frontend and Backend

1. Go back to Render Dashboard > your backend service > **Environment**.
2. Update `FRONTEND_ORIGIN` to your exact Vercel domain:
   ```
   FRONTEND_ORIGIN=https://your-frontend-name.vercel.app
   ```
   *(You can also pass comma-separated origins like `https://your-frontend-name.vercel.app,http://localhost:5173`)*.
3. Save changes (Render will automatically redeploy with the updated CORS policy).

---

## Verification Checklist

- [ ] Visit `https://your-backend-name.onrender.com/health` -> should return `{"status":"ok"}`.
- [ ] Visit `https://your-frontend-name.vercel.app/` -> homepage loads cleanly without errors.
- [ ] Visit `https://your-frontend-name.vercel.app/register` and reload the page -> loads properly (no 404, verified by `vercel.json`).
- [ ] Register a test account -> account is created, authentication token is stored, user is logged in.
- [ ] Go to `/create` -> photo-capture interface opens and captures photos from all angles.
