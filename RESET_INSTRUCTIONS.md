# 🔄 How to Reset Your Session

Since we reset the database, your old session is no longer valid. Here's how to fix it:

## Quick Fix (Choose One):

### Option 1: Clear Browser Data
1. Open Browser Console (F12 or Right-click → Inspect → Console)
2. Run this command:
```javascript
localStorage.clear(); location.reload();
```

### Option 2: Manual Clear
1. Press F12 (or Right-click → Inspect)
2. Go to "Application" tab
3. Click "Local Storage" → `http://localhost:3000`
4. Click "Clear All" button
5. Refresh the page (F5)

### Option 3: Use More Menu
1. Click the three dots (⋯) in the left sidebar
2. Click "Sign out"
3. Sign up again with a new account

## Then:
1. **Sign up** at `http://localhost:3000` with a NEW email/username
2. **Create your workspace** through the onboarding
3. **Start using the app!**

## Why This Happened:
We had to recreate the database with the correct schema to fix the DM messaging issue. The old user accounts and sessions were cleared in the process.

---

## ✅ Everything is now working:
- ✅ Direct Messages
- ✅ File uploads
- ✅ Channels
- ✅ Real-time messaging
- ✅ All sidebar navigation
- ✅ Activity feed
- ✅ Files browser
- ✅ More menu with sign out

The app is fully functional once you clear your old session!

