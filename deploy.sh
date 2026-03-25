#!/usr/bin/env bash
# =============================================================================
# Production deployment script for emanat.systems
# Run this ON the DigitalOcean droplet (104.248.149.174)
# =============================================================================
set -euo pipefail

DOMAIN="emanat.systems"
REPO_URL="git@github.com:urolovforever/diplom-ishi-latest.git"
APP_DIR="/opt/emanat"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== emanat.systems deployment ==="

# -------------------------------------------------------------------------
# 1. Install Docker & Docker Compose if missing
# -------------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
    echo ">> Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# -------------------------------------------------------------------------
# 2. Clone or pull the repository
# -------------------------------------------------------------------------
if [ -d "$APP_DIR" ]; then
    echo ">> Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    echo ">> Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# -------------------------------------------------------------------------
# 3. Check .env file
# -------------------------------------------------------------------------
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.production" ]; then
        echo ">> Copying .env.production -> .env (edit it with real secrets!)"
        cp "$APP_DIR/.env.production" "$APP_DIR/.env"
        echo ""
        echo "!!! IMPORTANT: Edit $APP_DIR/.env with real secrets before continuing !!!"
        echo "    nano $APP_DIR/.env"
        echo ""
        read -rp "Press ENTER after editing .env, or Ctrl+C to abort..."
    else
        echo "ERROR: No .env file found. Create one from .env.production template."
        exit 1
    fi
fi

# -------------------------------------------------------------------------
# 4. Build and start containers
# -------------------------------------------------------------------------
echo ">> Building images..."
docker compose -f "$COMPOSE_FILE" build

echo ">> Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ">> Waiting for backend to be ready..."
sleep 10

# -------------------------------------------------------------------------
# 5. Obtain SSL certificate (first time only)
# -------------------------------------------------------------------------
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

# Check if cert exists inside the certbot volume
if ! docker compose -f "$COMPOSE_FILE" run --rm certbot \
    sh -c "test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then

    echo ">> Obtaining SSL certificate..."

    # Stop nginx so certbot can bind to port 80 in standalone mode
    docker compose -f "$COMPOSE_FILE" stop nginx

    # Source .env for CERTBOT_EMAIL
    source "$APP_DIR/.env"
    CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@$DOMAIN}"

    docker compose -f "$COMPOSE_FILE" run --rm \
        -p 80:80 \
        certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$CERTBOT_EMAIL" \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

    echo ">> Restarting nginx with SSL..."
    docker compose -f "$COMPOSE_FILE" up -d nginx
else
    echo ">> SSL certificate already exists, skipping."
fi

# -------------------------------------------------------------------------
# 6. Reload nginx to pick up any config changes
# -------------------------------------------------------------------------
echo ">> Reloading nginx..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload || true

# -------------------------------------------------------------------------
# 7. Verify
# -------------------------------------------------------------------------
echo ""
echo "=== Deployment complete ==="
echo ""
echo "Verify:"
echo "  curl -I https://$DOMAIN"
echo "  curl -I http://$DOMAIN  (should redirect to HTTPS)"
echo "  curl https://$DOMAIN/api/"
echo ""
echo "Logs:"
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
