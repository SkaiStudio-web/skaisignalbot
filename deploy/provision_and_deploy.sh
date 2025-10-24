#!/usr/bin/env bash
set -euo pipefail
DOMAIN="skaisignalbot.com"
EMAIL="admin@skaisignalbot.com"
PROJECT_DIR="/home/ubuntu/tradingai"

apt update -y
apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose nginx certbot python3-certbot-nginx
mkdir -p "$PROJECT_DIR"
chown $SUDO_USER:$SUDO_USER "$PROJECT_DIR"

cat > "$PROJECT_DIR/.env" <<EOF
OPENAI_API_KEY=sk-REPLACE_ME
JWT_SECRET=supersecretchangeit
NODE_ENV=production
EOF

docker compose up -d --build

NGINX_CONF="/etc/nginx/sites-available/tradingai"
cat > "$NGINX_CONF" <<NG
server {
  listen 80;
  server_name skaisignalbot.com;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location / {
    proxy_pass http://127.0.0.1:5173/;
    proxy_set_header Host $host;
  }
}
NG

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/tradingai
nginx -t
systemctl restart nginx

certbot --nginx -d skaisignalbot.com --non-interactive --agree-tos -m "$EMAIL"
echo "Deployment finished. Edit $PROJECT_DIR/.env to add OPENAI_API_KEY and restart docker compose."
