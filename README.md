# TradingAI — Production Web App (skaisignalbot.com)

This package is configured for domain `skaisignalbot.com` and includes:

- Backend: Node.js + Express + MongoDB + Socket.IO + OpenAI integration
- Frontend: React + Vite + Tailwind (dashboard look)
- Docker Compose with MongoDB container
- Nginx config and deploy script configured for skaisignalbot.com

Before running, edit `.env` in project root to set:
- OPENAI_API_KEY
- JWT_SECRET

Follow docs/DEPLOY.md for step-by-step instructions.
