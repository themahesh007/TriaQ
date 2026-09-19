# Backend Deployment Guide (Render)

Follow these steps to deploy the TriaQ backend to Render:

1. **Create PostgreSQL Database on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/)
   - Click **New +** -> **PostgreSQL**
   - Name it `triaq-db`, choose free tier, and click **Create Database**
   - Once provisioned, copy the **Internal Database URL** (or External if connecting from outside)

2. **Create Web Service**:
   - Click **New +** -> **Web Service**
   - Connect your Git repository containing TriaQ
   - Set **Root Directory** to `backend`
   - Set **Environment** to `Node`
   - Set **Build Command**: `npm install`
   - Set **Start Command**: `npm start` (or `node src/server.js`)

3. **Set Environment Variables**:
   In the Environment tab, add:
   - `PORT`: `3001` (or let Render set it)
   - `DATABASE_URL`: Your Render PostgreSQL connection string
   - `ALLOWED_ORIGIN`: Your deployed frontend URL (e.g. `https://triaq.vercel.app`) or `*`
   - `LLM_API_KEY`: (Optional) OpenAI/Anthropic API key for AI summaries

4. **Deploy**:
   - Click **Create Web Service**. Your API will be live at `https://triaq-backend.onrender.com`.
