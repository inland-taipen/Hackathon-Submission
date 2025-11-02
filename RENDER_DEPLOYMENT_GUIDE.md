# 🚀 Deploy Backend to Render - Step by Step

## Quick Deployment Guide

Follow these steps to deploy your Slack Clone backend to Render.

---

## Prerequisites

- [x] Code pushed to GitHub
- [x] Render account (free) - [Sign up here](https://render.com)

---

## Step 1: Push to GitHub (if not done)

```bash
cd /Users/anika/midnight
git add .
git commit -m "feat: production-ready deployment"
git push origin main
```

---

## Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest!)

---

## Step 3: Create New Web Service

1. Click **"New +"** (top right)
2. Select **"Web Service"**
3. Click **"Connect a repository"**
4. **Authorize Render** to access your GitHub
5. **Select your repository** (`midnight`)

---

## Step 4: Configure Service

Fill in these settings:

### Basic Settings
- **Name:** `slack-clone-backend` (or any name you like)
- **Region:** `Oregon (US West)` (or closest to you)
- **Branch:** `main`
- **Root Directory:** `server`
- **Runtime:** `Node`

### Build Settings
- **Build Command:** `npm install`
- **Start Command:** `node index.js`

### Instance Settings
- **Instance Type:** `Free` (select free tier)

---

## Step 5: Add Environment Variables

Scroll down to **"Environment Variables"** section and add these:

Click **"Add Environment Variable"** for each:

```
NODE_ENV=production
```

```
PORT=3001
```

```
FRONTEND_URL=https://your-frontend-will-go-here.vercel.app
```
*(You'll update this after deploying frontend)*

### Optional - OAuth (if you want GitHub/Google login):

```
GITHUB_CLIENT_ID=your_github_client_id
```

```
GITHUB_CLIENT_SECRET=your_github_client_secret
```

```
GOOGLE_CLIENT_ID=your_google_client_id
```

```
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

```
GOOGLE_REDIRECT_URI=https://your-frontend-will-go-here.vercel.app/auth/callback?provider=google
```

**Note:** OAuth is optional! The app works with email/password without it.

---

## Step 6: Deploy!

1. Scroll to bottom
2. Click **"Create Web Service"**
3. Wait 2-5 minutes while Render:
   - Builds your app
   - Installs dependencies
   - Starts the server

You'll see logs scrolling by - this is normal!

---

## Step 7: Get Your Backend URL

Once deployed (green "Live" badge), you'll see your URL:

```
https://slack-clone-backend-xxxx.onrender.com
```

**Copy this URL!** You'll need it for the frontend.

---

## Step 8: Test Backend

Click your backend URL or test with:

```bash
curl https://your-backend-url.onrender.com/health
```

You should see:
```json
{"status":"ok"}
```

**Backend is live!** ✅

---

## Step 9: Deploy Frontend to Vercel

Now deploy your frontend with the backend URL:

### Option A: Vercel Web UI

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. **Import** your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
5. **Add Environment Variable:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```
   (Use your Render URL from Step 7)
6. Click **"Deploy"**

### Option B: Vercel CLI

```bash
cd client
npm i -g vercel
vercel

# When prompted:
# Set up and deploy? Yes
# Which scope? (your account)
# Link to existing project? No
# Project name? slack-clone
# Directory? ./
# Override settings? Yes
# Build command? npm run build
# Output directory? .next
# Development command? npm run dev
```

Then set environment variable:
```bash
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://your-backend-url.onrender.com
# For: Production
```

Redeploy:
```bash
vercel --prod
```

---

## Step 10: Update Backend FRONTEND_URL

Go back to Render:

1. Open your backend service
2. Click **"Environment"** tab
3. Edit `FRONTEND_URL`
4. Set to your Vercel URL: `https://your-app.vercel.app`
5. Click **"Save Changes"**

Render will automatically redeploy!

---

## Step 11: Update OAuth Redirect URIs (if using OAuth)

### GitHub OAuth:
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Open your OAuth App
3. Update **Authorization callback URL:**
   ```
   https://your-app.vercel.app/auth/callback?provider=github
   ```

### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Open your OAuth 2.0 Client ID
3. Add **Authorized redirect URI:**
   ```
   https://your-app.vercel.app/auth/callback?provider=google
   ```
4. Update `GOOGLE_REDIRECT_URI` in Render environment variables

---

## ✅ You're Live!

Your Slack Clone is now deployed! 🎉

- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-backend.onrender.com

---

## 🧪 Test Your Deployment

1. Visit your frontend URL
2. Click **"Sign up"**
3. Create an account
4. Create a workspace
5. Send a message
6. Open in another browser tab → See real-time updates!

---

## 🐛 Troubleshooting

### Backend Not Starting?
- Check logs in Render dashboard
- Verify `Start Command` is `node index.js`
- Check that `Root Directory` is `server`

### CORS Errors?
- Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly
- Include `https://` in the URL

### Environment Variables Not Working?
- Click **"Manual Deploy"** after changing variables
- Or use **"Save Changes"** which auto-redeploys

### Database Issues?
- SQLite is created automatically in Render
- For production scale, upgrade to PostgreSQL

### Render Free Tier Sleeping?
- Free tier spins down after 15 min inactivity
- First request may take 30-60 seconds to wake up
- Upgrade to paid tier for 24/7 uptime

---

## 💰 Render Free Tier Limits

- ✅ Free forever
- ✅ 750 hours/month (enough for 1 service)
- ✅ Automatic SSL
- ⚠️ Spins down after 15 min inactivity
- ⚠️ 500 MB disk space
- 💡 Upgrade to $7/month for 24/7 uptime

---

## 📊 Monitor Your App

### View Logs
1. Open service in Render
2. Click **"Logs"** tab
3. See real-time logs

### View Metrics
1. Click **"Metrics"** tab
2. See CPU, memory, requests

---

## 🎉 Next Steps

1. **Test thoroughly** - Create accounts, send messages
2. **Update README** - Add your live URLs
3. **Share with judges** - Give them the link!
4. **Monitor** - Check logs for errors

---

## 📞 Need Help?

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Render Support:** [render.com/support](https://render.com/support)
- **This Project:** See `DEPLOYMENT_INSTRUCTIONS.md`

---

**🚀 Your Slack Clone is now LIVE on Render!**

**Update your README with the live URL and share it!** 🎊

