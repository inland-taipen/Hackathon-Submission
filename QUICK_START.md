# 🚀 Quick Start Guide

## For Hackathon Judges

### Step 0: Get the Project

**You'll receive the project as:**
- A ZIP file to extract, OR
- A Git repository to clone, OR
- A folder on USB/shared drive

**Extract/copy it to your computer** (e.g., Downloads folder)

---

### 1-Minute Setup

```bash
# Navigate to project (adjust path to where YOU extracted it!)
cd ~/Downloads/midnight     # Mac/Linux
cd C:\Users\YourName\Downloads\midnight   # Windows

# Copy environment file (rename env.example to .env)
cp env.example .env

# Start with Docker
docker-compose up -d

# Access application
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

### Test Login
- **Email:** test@example.com
- **Password:** test123

Or create a new account via signup!

### Features to Demo
1. ✅ Create workspace
2. ✅ Create channel
3. ✅ Send real-time message
4. ✅ Upload file
5. ✅ Add reaction
6. ✅ See presence indicators (green dots)
7. ✅ Check unread badges
8. ✅ Try dark mode

---

## Without Docker

### Terminal 1 - Backend
```bash
cd server
npm install
node index.js
```

### Terminal 2 - Frontend
```bash
cd client
npm install
npm run dev
```

---

## OAuth Setup (Optional)

App works without OAuth! Use email/password signup.

To enable GitHub/Google login:
1. See `env.example` for instructions
2. Get credentials from GitHub/Google
3. Add to `.env` file

---

## Troubleshooting

**Ports in use?**
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**Reset database?**
```bash
docker-compose down -v
docker-compose up -d
```

**Need help?**
See `README.md` or `DEPLOYMENT_GUIDE.md`

---

**Ready in 60 seconds! 🎉**

