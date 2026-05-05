# 🚢 SAMIndex Deployment Guide
### Production-Grade Deployment Strategy

This document outlines the professional deployment workflow for the SAMIndex ecosystem.

---

## 🏗 Architecture Overview
SAMIndex uses a split-stack architecture optimized for low-latency search and high-throughput background processing.

- **Frontend**: Single Page Application (SPA) hosted on Vercel.
- **Backend**: Node.js REST API hosted on Render.
- **Data Layer**: MongoDB Atlas (Persistent) + Upstash Redis (Volatile/Queue).
- **Background Layer**: BullMQ workers for asynchronous repository scanning.

---

## 🛠 Backend Deployment (Render)

### 1. Environment Configuration
Ensure the following variables are set in your Render dashboard:

| Variable | Description | Recommended Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | Database connection | MongoDB Atlas Connection String |
| `JWT_SECRET` | Auth signing key | 32+ character random string |
| `GOOGLE_CALLBACK_URL` | OAuth redirect | `https://your-api.onrender.com/api/v1/auth/google/callback` |
| `REDIS_TLS` | SSL for Redis | `true` (Required for Upstash) |
| `GITHUB_TOKEN` | Repository Access | GitHub Personal Access Token |

### 2. Port Binding
The backend is configured to bind to the `PORT` environment variable (default: `5000`). Render automatically provides this.

---

## 🎨 Frontend Deployment (Vercel)

### 1. Build Settings
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 2. Routing Configuration
To support SPA routing, a `vercel.json` is required at the project root to redirect all 404s to `index.html`.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 🔐 Google OAuth Setup (Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services > Credentials**.
3. Update your **OAuth 2.0 Client ID**:
   - **Authorized JavaScript origins**: `https://sam-index.vercel.app`
   - **Authorized redirect URIs**: `https://samindex-api.onrender.com/api/v1/auth/google/callback`
4. **IMPORTANT**: Ensure the Client Secret in Render matches the newly generated secret from Google Console.

---

## 🛠 Troubleshooting & Maintenance

### 1. Invalid Grant / Token Error
- Verify that `GOOGLE_CALLBACK_URL` is **identical** in both Render and Google Console.
- Ensure `NODE_ENV` is NOT `development` if you want production-level security (or set it to `development` for verbose error logs).
- Check for trailing spaces in environment variables.

### 2. Redis Connection Issues
- Ensure `REDIS_TLS` is set to `true`.
- Verify that your Upstash Redis host and port are correct.

---

<p align="center"><i>SAMIndex Deployment v1.0 — Managed by Antigravity</i></p>
