# Dishviz Backend (Render Deployment)

This is the standalone Node.js + Express + Prisma backend for Dishviz. It is fully decoupled from the frontend and configured for deployment on [Render](https://render.com).

---

## 1. Quick Deploy to Render

### Option A: 1-Click Blueprint (Recommended)
If your repository includes `render.yaml`:
1. In the [Render Dashboard](https://dashboard.render.com), click **"New"** > **"Blueprint"**.
2. Connect your Git repository.
3. Render automatically reads `render.yaml`, pre-populates all build commands, and generates secure secrets (`JWT_SECRET`, `MASTER_INTERNAL_SECRET`).
4. Set the `FRONTEND_ORIGIN` variable to your Vercel URL (e.g., `https://your-app.vercel.app`).
5. Click **"Apply"**.

### Option B: Manual Web Service
1. In Render Dashboard, click **"New"** > **"Web Service"**.
2. Connect your Git repository (set **Root Directory** to `backend` if deploying from monorepo).
3. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   | Key | Value | Note |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production security & optimizations |
   | `FRONTEND_ORIGIN` | `https://your-app.vercel.app` | Comma-separated if multiple domains |
   | `DATABASE_URL` | `file:./prod.db` | Or a Render PostgreSQL connection string |
   | `JWT_SECRET` | *Click "Generate"* | Random 32+ char secret |
   | `COOKIE_CROSS_SITE` | `true` | Enables SameSite=None; Secure for Vercel<->Render |
   | `AR_PROVIDER` | `unconfigured` | Set to `tripo3d` when you have an API key |
   | `AR_PROVIDER_API_KEY` | *(your key)* | Tripo3D API key (from platform.tripo3d.ai) |
   | `STORAGE_PROVIDER` | `local` | Or `s3` for AWS S3 / Cloudflare R2 |
   | `STORAGE_LOCAL_PATH` | `./uploads` | Local upload directory |
   | `MASTER_INTERNAL_SECRET` | *Click "Generate"* | Private secret for internal first-party ingestion |
5. Click **"Create Web Service"**.

---

## 2. Cross-Origin Compatibility with Vercel

- **CORS Handling**: The backend automatically parses comma-separated origins in `FRONTEND_ORIGIN` and auto-whitelists Vercel preview domains (`*.vercel.app`) when a Vercel domain is specified.
- **Dual Authentication**: Session tokens are passed via cross-site cookies (`SameSite=None; Secure`) and `Authorization: Bearer <token>` in headers. This ensures 100% login reliability regardless of browser third-party cookie restrictions.

---

## 3. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup SQLite database
npx prisma db push

# 3. Start development server
npm run dev
# Running on http://localhost:3001
```
