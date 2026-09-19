# 🚀 TriaQ Cloud Deployment & Custom Domain Guide

Follow these 3 easy steps to deploy **TriaQ** online for free and connect your custom domain so anyone in the world can review and use it 24/7.

---

## Step 1: Push Code to Your GitHub

Your local repository is already initialized and cleanly committed.

1. Go to **[github.com/new](https://github.com/new)**.
2. Enter Repository Name: `TriaQ` (set it to **Public** or **Private**).
3. Do **NOT** check "Add a README file" (we already have one).
4. Click **Create repository**.
5. Copy your repository link (e.g. `https://github.com/YOUR_USERNAME/TriaQ.git`).
6. In your terminal / PowerShell in the project folder, run:

```powershell
# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/TriaQ.git

# Push the code
git push -u origin main
```

*(Note: Git is already configured on your machine at `MinGit/cmd/git.exe`).*

---

## Step 2: Deploy Backend on Render.com (Free)

1. Go to **[Render.com](https://render.com)** and sign in with your GitHub account.
2. Click **New +** at the top right and choose **Web Service**.
3. Select your `TriaQ` GitHub repository.
4. Configure the settings:
   - **Name**: `triaq-backend`
   - **Region**: Singapore or Frankfurt (or nearest to your users)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and click **Add Environment Variable**:
   - Key: `GEMINI_API_KEY`
   - Value: *(Paste your Gemini API key)*
   - Key: `ALLOWED_ORIGIN`
   - Value: `*`
6. Click **Deploy Web Service**.
7. In ~1-2 minutes, Render will provide your live backend URL (e.g. `https://triaq-backend.onrender.com`). Copy this URL!

---

## Step 3: Deploy Frontend on Vercel.com (Free)

1. Go to **[Vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Import your `TriaQ` repository.
4. Configure the settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`.
5. Under **Environment Variables**, add:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://triaq-backend.onrender.com` *(your Render backend URL from Step 2)*
6. Click **Deploy**.
7. In ~30 seconds, your frontend will be live at `https://triaq.vercel.app` (or similar)!

---

## 🌐 Step 4: Connect Your Custom Domain (e.g., `triaq.in` or `yourdomain.com`)

You mentioned earlier that you created a domain. Here is how to link it in 60 seconds:

1. In your **Vercel Project Dashboard**:
   - Go to **Settings** → **Domains**.
   - Type your custom domain name (e.g. `www.yourdomain.com` or `yourdomain.com`) and click **Add**.
2. Vercel will show you the exact DNS records to add:
   - **CNAME Record**: `cname.vercel-dns.com` (for `www`)
   - **A Record**: `76.76.21.21` (for root domain `@`)
3. Open the registrar where you bought your domain (GoDaddy, Namecheap, Hostinger, Cloudflare, etc.):
   - Go to **DNS Management** / **DNS Records**.
   - Add the **CNAME** or **A record** provided by Vercel.
4. Within a few minutes, Vercel will automatically provision a **free SSL Certificate (HTTPS)** and your custom domain will be live worldwide!

---

## 🔒 Security & Privacy Notice
- `backend/.env` is ignored by git and will never be pushed to GitHub.
- Your `GEMINI_API_KEY` stays securely encrypted inside Render's environment settings.
