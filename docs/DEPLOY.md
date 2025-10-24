
# Deploying TradingAI for skaisignalbot.com

1. Ensure DNS A record for skaisignalbot.com points to your server IP.
2. Upload this project to your VPS at /home/ubuntu/tradingai
3. Edit .env and add:
   OPENAI_API_KEY=sk-...
   JWT_SECRET=your_jwt_secret
4. Run:
   sudo bash deploy/provision_and_deploy.sh
5. The script will install Docker, docker-compose, nginx, and request SSL cert.

After deployment:
- Check logs: docker compose logs -f backend
- If certbot fails, ensure DNS is propagated.

