# Dishviz Frontend (Vercel Deployment)

This is the standalone React + Vite frontend for Dishviz. It is fully decoupled from the backend and configured for deployment on [Vercel](https://vercel.com).

---

## 1. Quick Deploy to Vercel

### Option A: Deploy from a Separate Repository
If you created a dedicated repository containing only the `frontend/` files:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New"** > **"Project"**.
2. Select your repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (or `tsc && vite build`)
   - **Output Directory**: `dist`
4. Add the Environment Variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-name.onrender.com` (your Render backend URL without trailing slash)
5. Click **"Deploy"**.

### Option B: Deploy from the Monorepo
If deploying from the combined repository:
1. In Vercel, set **Root Directory** to `frontend`.
2. Add the `VITE_API_BASE_URL` environment variable.
3. Click **"Deploy"**.

---

## 2. Configuration & Routing

- **Client-Side Routing**: The included `vercel.json` automatically rewrites all incoming routes (`/login`, `/dashboard`, `/create`, `/result/:jobId`, etc.) to `/index.html` to prevent 404 errors on page reload.
- **Cross-Origin Authentication**: The frontend sends session tokens via both `credentials: 'include'` and `Authorization: Bearer <token>`, allowing full cross-origin compatibility between Vercel (`*.vercel.app`) and Render (`*.onrender.com`).

---

## 3. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
# Running on http://localhost:5173 (proxies /api to http://localhost:3001)

# 3. Production build test
npm run build
```
