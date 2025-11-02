# How to Start the Application

## Quick Start

1. **Make sure you're in the root directory:**
   ```bash
   cd /Users/anika/midnight
   ```

2. **Start both servers (frontend + backend):**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend app on `http://localhost:3000`

## If you get connection errors:

### Option 1: Start servers separately

**Terminal 1 - Backend:**
```bash
cd server
node index.js
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### Option 2: Check if ports are in use

```bash
# Check port 3001 (backend)
lsof -ti:3001

# Check port 3000 (frontend)
lsof -ti:3000
```

If processes are found, kill them:
```bash
kill -9 $(lsof -ti:3001)
kill -9 $(lsof -ti:3000)
```

## Troubleshooting

- **"Cannot connect to server"**: Make sure the backend server is running on port 3001
- **Registration fails**: Check the server console for error messages
- **CORS errors**: Ensure backend CORS is configured to allow `http://localhost:3000`

