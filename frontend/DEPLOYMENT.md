# Frontend Deployment Guide (Vercel)

Deploy the TriaQ frontend to Vercel in a few simple clicks:

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com/) and click **Add New Project**.
3. Select your repository.
4. Set **Root Directory** to `frontend`.
5. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: The URL of your deployed backend (e.g. `https://triaq-backend.onrender.com`).
6. Click **Deploy**. Vercel will automatically build using Vite and host your app with global CDN speed.
