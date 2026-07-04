# LogPilot AI Deployment Guide 🚀

Follow these steps to deploy LogPilot AI to cloud environments.

---

## 💻 Backend Deployment (Render or Railway)

Deploying the Express backend to **Render** or **Railway** is simple as they both support Node.js applications natively.

### Option A: Render (Web Service)
1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the following parameters:
   - **Runtime**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
4. In the **Environment** tab, add the following variables:
   - `PORT` = `5000`
   - `MONGODB_URI` = `mongodb+srv://...` (Your MongoDB Atlas connection string)
   - `GROQ_API_KEY` = `gsk_...` (Your Groq API key)
   - `NODE_ENV` = `production`
5. Click **Deploy Web Service**.
6. Copy the generated Web Service URL (e.g., `https://logpilot-backend.onrender.com`).

---

### Option B: Railway (Service)
1. Log in to [Railway](https://railway.app) and click **New Project > Deploy from GitHub repo**.
2. Select your repository.
3. Railway will auto-detect the root directory. To build only the backend, go to the Service **Settings** and set:
   - **Root Directory**: `/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. In the **Variables** tab, click **New Variable** and add:
   - `PORT` = `5000`
   - `MONGODB_URI` = `mongodb+srv://...`
   - `GROQ_API_KEY` = `gsk_...`
   - `NODE_ENV` = `production`
5. Railway will deploy automatically. Go to **Settings > Domains** and generate a public URL.

---

## 🎨 Frontend Deployment (Vercel)

We compile the React client to static assets and deploy it to Vercel.

### Vercel Deployment Steps
1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your GitHub repository.
3. Configure the Project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variable**:
   - `VITE_API_URL` = `https://your-backend-url.onrender.com` (Use the actual URL of your deployed backend service from Render/Railway, without a trailing slash).
5. Click **Deploy**.
6. Once deployed, open your Vercel URL to access your live production app!
