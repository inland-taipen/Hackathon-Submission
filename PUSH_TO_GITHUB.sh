#!/bin/bash

# 🚀 GitHub Push Script for Hackathon Submission
# Run this script to push your project to GitHub

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║        🚀 PUSHING SLACK CLONE TO GITHUB                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the project root (/Users/anika/midnight)"
    exit 1
fi

echo "📋 Step 1: Initializing Git repository..."
git init

echo ""
echo "📋 Step 2: Adding all files (sensitive files excluded by .gitignore)..."
git add .

echo ""
echo "📋 Step 3: Checking what will be committed..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "⚠️  IMPORTANT: Review the files above!"
echo ""
echo "These files SHOULD NOT appear:"
echo "  ❌ .env"
echo "  ❌ database.sqlite"
echo "  ❌ server/.env"
echo "  ❌ server/database.sqlite"
echo "  ❌ server/uploads/ (with files)"
echo ""

read -p "Does everything look correct? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Push cancelled. Please review and try again."
    exit 1
fi

echo ""
echo "📋 Step 4: Creating commit..."
git commit -m "🏆 Hackathon Submission: Slack Clone with RL Environment

Features:
- Full-featured Slack clone with 30+ features
- Real-time messaging with WebSocket
- OAuth authentication (GitHub + Google)
- File uploads, reactions, threads, DMs
- User presence and unread counts
- RL environment for training AI agents
- Production-ready with Docker
- 60+ test cases
- Comprehensive documentation

Tech Stack:
- Frontend: Next.js 14, React 18, TypeScript, Tailwind
- Backend: Node.js, Express, SQLite, Socket.io
- RL: Python, OpenAI Gym, pure Python implementation
- Deployment: Docker, Docker Compose

Built for Hackathon 2025 ⚡"

echo ""
echo "✅ Commit created!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Create a GitHub repository:"
echo "   → Go to: https://github.com/new"
echo "   → Repository name: slack-clone-rl-platform"
echo "   → Make it PUBLIC (so judges can see it)"
echo "   → DON'T initialize with README"
echo ""
echo "2. Copy your repository URL, then run:"
echo ""
echo "   git remote add origin YOUR_GITHUB_URL"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Verify on GitHub:"
echo "   → Check that .env files are NOT visible"
echo "   → Check that database.sqlite is NOT visible"  
echo "   → Verify README displays correctly"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Ready to push to GitHub!"
echo ""

