# 🚀 Deployment Guide - Slack Clone

## Quick Start for Hackathon Judges

### Prerequisites
- Docker & Docker Compose installed
- GitHub/Google OAuth credentials (or skip for email auth only)

### 1-Minute Setup

```bash
# Clone and navigate
cd midnight

# Copy environment template
cp .env.example .env

# Start with Docker (uses default config)
docker-compose up -d

# Access the application
open http://localhost:3000
```

**Default credentials for testing:**
- Email: `demo@example.com`
- Password: `demo123`

Or create a new account via signup!

---

## Detailed Setup

### Step 1: Get OAuth Credentials (Optional)

#### GitHub OAuth
1. Visit: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Name: `Slack Clone Demo`
   - Homepage: `http://localhost:3000`
   - Callback: `http://localhost:3000/auth/callback?provider=github`
4. Copy Client ID & Secret

#### Google OAuth
1. Visit: https://console.cloud.google.com/apis/credentials
2. Create project → Enable Google+ API
3. Create OAuth 2.0 Client ID
4. Add:
   - Origins: `http://localhost:3000`
   - Redirects: `http://localhost:3000/auth/callback?provider=google`
5. Copy Client ID & Secret

### Step 2: Configure Environment

```bash
# Edit .env file
nano .env

# Add your credentials:
GITHUB_CLIENT_ID=your_id_here
GITHUB_CLIENT_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_id_here
GOOGLE_CLIENT_SECRET=your_secret_here
```

**Note:** App works without OAuth! Email/password signup is always available.

### Step 3: Start Application

```bash
# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 4: Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **WebSocket:** ws://localhost:3001

---

## Without Docker (Local Development)

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

## Verification Steps

### 1. Check Services
```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost:3000
```

### 2. Test Functionality
1. ✅ Open http://localhost:3000
2. ✅ Create account (or login)
3. ✅ Create workspace
4. ✅ Create channel
5. ✅ Send message
6. ✅ Upload file
7. ✅ Add reaction
8. ✅ Open in second browser tab
9. ✅ See real-time updates

---

## Troubleshooting

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001

# Kill processes
kill -9 <PID>
```

### Docker Issues
```bash
# Reset everything
docker-compose down -v
docker system prune -af
docker-compose up -d --build
```

### Database Reset
```bash
# Remove database
docker-compose down -v

# Or manually
rm server/database.sqlite

# Restart
docker-compose up -d
```

### OAuth Errors
1. Verify redirect URIs match exactly
2. Check credentials are correct
3. Ensure OAuth apps are approved
4. Try incognito mode

---

## Production Deployment

### AWS/DigitalOcean/VPS

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repo
git clone <repo> && cd midnight

# 3. Set production env
export NODE_ENV=production

# 4. Update OAuth URLs
# Change localhost:3000 to your-domain.com

# 5. Deploy
docker-compose up -d

# 6. Setup Nginx reverse proxy
# 7. Add SSL with Let's Encrypt
```

### Heroku

```bash
# 1. Create apps
heroku create slack-clone-backend
heroku create slack-clone-frontend

# 2. Set config
heroku config:set GITHUB_CLIENT_ID=xxx -a slack-clone-backend

# 3. Deploy
git push heroku main
```

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd client
vercel --prod
```

---

## Performance Optimization

### For Production:

1. **Database:** Switch to PostgreSQL
```javascript
// Replace SQLite with PostgreSQL
npm install pg
// Update connection string
```

2. **Session Storage:** Use Redis
```javascript
npm install redis connect-redis
// Update session store
```

3. **File Storage:** Use S3
```javascript
npm install aws-sdk
// Update file upload to S3
```

4. **Caching:** Add Redis cache
```javascript
// Cache user presence, messages
```

5. **Load Balancing:** Add Nginx
```nginx
upstream backend {
    server backend1:3001;
    server backend2:3001;
}
```

---

## Monitoring

### Logs
```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Application logs
tail -f server/logs/app.log
```

### Metrics
```bash
# Container stats
docker stats

# Resource usage
docker-compose top
```

---

## Backup & Restore

### Backup
```bash
# Backup database
docker cp slack-clone-backend:/app/database.sqlite ./backup/

# Backup uploads
docker cp slack-clone-backend:/app/uploads ./backup/
```

### Restore
```bash
# Restore database
docker cp ./backup/database.sqlite slack-clone-backend:/app/

# Restore uploads
docker cp ./backup/uploads slack-clone-backend:/app/
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Use HTTPS in production
- [ ] Set secure session secrets
- [ ] Enable rate limiting
- [ ] Add CORS restrictions
- [ ] Sanitize user inputs
- [ ] Update dependencies
- [ ] Enable CSP headers
- [ ] Use environment variables
- [ ] Implement audit logs

---

## Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3
```

### Load Balancer
```nginx
# nginx.conf
upstream slack_backend {
    least_conn;
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}
```

### WebSocket Scaling
```javascript
// Use Socket.io Redis adapter
const redisAdapter = require('socket.io-redis');
io.adapter(redisAdapter({ host: 'redis', port: 6379 }));
```

---

## Demo Data (Optional)

### Seed Database
```bash
# Create demo workspace
curl -X POST http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Demo Workspace"}'

# Create demo channel
curl -X POST http://localhost:3001/api/workspaces/<id>/channels \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "general"}'
```

---

## Quick Demo Script

```bash
# 1. Start fresh
docker-compose down -v && docker-compose up -d

# 2. Wait for services (30 seconds)
sleep 30

# 3. Open browser
open http://localhost:3000

# 4. Demo workflow:
#    - Create account
#    - Create workspace "Hackathon Team"
#    - Create channel "announcements"
#    - Send message "Welcome!"
#    - Upload file
#    - Open second browser tab
#    - Watch real-time updates
```

---

## Support

**Issues?**
1. Check logs: `docker-compose logs`
2. Review README.md
3. Check environment variables
4. Verify ports are free
5. Try fresh start: `docker-compose down -v && docker-compose up -d`

---

**Deployment Complete! 🎉**

Your Slack clone is now running and ready for demo!

