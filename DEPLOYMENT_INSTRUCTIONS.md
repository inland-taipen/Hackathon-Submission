# 🚀 Deployment Instructions

## Quick Deploy to Cloud

Your Slack Clone is now configured for easy deployment!

---

## Option 1: Deploy to Vercel (Frontend) + Railway (Backend) ⭐ RECOMMENDED

### Step 1: Deploy Backend to Railway

1. **Go to** [railway.app](https://railway.app)
2. **Sign up/Login** with GitHub
3. **Click** "New Project" → "Deploy from GitHub repo"
4. **Select** your `midnight` repository
5. **Configure**:
   - Root Directory: `/server`
   - Build Command: `npm install`
   - Start Command: `node index.js`
6. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=https://your-frontend.vercel.app
   GITHUB_CLIENT_ID=your_github_id
   GITHUB_CLIENT_SECRET=your_github_secret
   GOOGLE_CLIENT_ID=your_google_id
   GOOGLE_CLIENT_SECRET=your_google_secret
   GOOGLE_REDIRECT_URI=https://your-frontend.vercel.app/auth/callback?provider=google
   ```
7. **Deploy!** Copy the Railway URL (e.g., `https://your-backend.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Go to** [vercel.com](https://vercel.com)
2. **Import** your GitHub repository
3. **Configure**:
   - Framework Preset: Next.js
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. **Add Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
   (Use the Railway URL from Step 1)
5. **Deploy!** You'll get a URL like `https://your-slack-clone.vercel.app`

### Step 3: Update Backend with Frontend URL

Go back to Railway and update:
```
FRONTEND_URL=https://your-slack-clone.vercel.app
```

**Done!** Your app is live! 🎉

---

## Option 2: Deploy Everything to Render

1. **Go to** [render.com](https://render.com)
2. **Create** a new "Blueprint"
3. **Connect** your GitHub repository
4. **Select** `render.yaml` (already configured!)
5. **Add Environment Variables** in Render dashboard
6. **Deploy!**

---

## Option 3: Deploy to Heroku

### Backend:
```bash
cd server
heroku create slack-clone-backend
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend.herokuapp.com
git push heroku main
```

### Frontend:
```bash
cd client
heroku create slack-clone-frontend
heroku config:set NEXT_PUBLIC_API_URL=https://slack-clone-backend.herokuapp.com
git push heroku main
```

---

## Environment Variables Reference

### Backend (Railway/Render/Heroku)
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.com
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=https://your-frontend-url.com/auth/callback?provider=google
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

---

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables set correctly
- [ ] CORS configured (already done!)
- [ ] OAuth redirects updated with production URLs
- [ ] Test signup/login
- [ ] Test real-time messaging
- [ ] Test file uploads
- [ ] Share URLs in README!

---

## Troubleshooting

### CORS Errors
- Check that `FRONTEND_URL` is set in backend
- Check that frontend URL matches exactly (https vs http)

### OAuth Not Working
- Update OAuth redirect URIs in GitHub/Google dashboards
- Use production URLs, not localhost

### Database Issues
- Railway/Render will create SQLite automatically
- For production, consider PostgreSQL

---

## Quick Test Commands

```bash
# Test backend
curl https://your-backend.railway.app/health

# Test frontend
curl https://your-slack-clone.vercel.app
```

---

**🎉 Your Slack Clone is now LIVE!**

Update your README.md with:
```markdown
## 🌐 Live Demo

- **Frontend**: https://your-slack-clone.vercel.app
- **Backend API**: https://your-backend.railway.app
```

