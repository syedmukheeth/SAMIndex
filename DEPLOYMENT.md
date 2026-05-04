# 🚀 Deployment Guide: SAMIndex

This guide will help you deploy your full-stack application with the **Frontend on Vercel** and the **Backend on Render**.

---

## 1. Backend: Render Deployment
Render will host your Express API and handle the connection to MongoDB and GitHub.

### Step-by-Step:
1.  **Create a New Web Service**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   Connect your GitHub repository.
2.  **Configure Service**:
    *   **Name**: `samindex-api` (or your choice).
    *   **Root Directory**: `backend` (Important!).
    *   **Environment**: `Node`.
    *   **Build Command**: `npm install`.
    *   **Start Command**: `npm start`.
3.  **Environment Variables**:
    Add the following in the **Environment** tab:
    *   `NODE_ENV`: `production`
    *   `PORT`: `10000` (Render's default)
    *   `MONGODB_URI`: Your MongoDB connection string.
    *   `GITHUB_TOKEN`: Your GitHub PAT.
    *   `JWT_SECRET`: A secure random string.
    *   `GOOGLE_CLIENT_ID`: (From Google Console)
    *   `GOOGLE_CLIENT_SECRET`: (From Google Console)
    *   `FRONTEND_URL`: Your Vercel URL (e.g., `https://samindex.vercel.app`).
4.  **Copy the URL**: Once deployed, copy your Render URL (e.g., `https://samindex-api.onrender.com`).

---

## 2. Frontend: Vercel Deployment
Vercel will host your React frontend and provide sub-millisecond load times.

### Step-by-Step:
1.  **Create a New Project**:
    *   Go to [vercel.com](https://vercel.com).
    *   Import your GitHub repository.
2.  **Configure Project**:
    *   **Framework Preset**: `Vite`.
    *   **Root Directory**: `frontend` (Important!).
3.  **Environment Variables**:
    Add the following in the **Environment Variables** section:
    *   `VITE_API_URL`: `https://your-render-url.onrender.com/api/v1` (The URL you copied from Render).
4.  **Deploy**: Click **Deploy**.

---

## 3. Important Post-Deployment Notes
*   **Google OAuth Redirects**:
    *   In your Google Cloud Console, add `https://your-render-url.onrender.com/api/v1/auth/google/callback` to the **Authorized redirect URIs**.
*   **CORS**:
    *   The backend is configured to allow requests from your frontend URL via the `FRONTEND_URL` environment variable. Ensure this matches exactly.
*   **Redis (Optional)**:
    *   For background indexing of large repos, you can add a **Redis** instance on Render and add `REDIS_URL` to your backend environment variables. If not provided, the app will use the synchronous local fallback.
