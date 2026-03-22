#!/bin/bash
set -euo pipefail

# Deployment script for Rice Ops Frontend
# Usage: ./deploy.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration — key resolution matches backend deploy (AWS_KEY_PATH + common paths)
# Override: SSH_KEY=/path/to/key.pem ./deploy.sh   or   AWS_KEY_PATH=... ./deploy.sh
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_SSH_FROM_ENV="${SSH_KEY:-}"
SSH_KEY=""
if [ -n "${_SSH_FROM_ENV}" ] && [ -f "${_SSH_FROM_ENV}" ]; then
  SSH_KEY="${_SSH_FROM_ENV}"
elif [ -n "${AWS_KEY_PATH:-}" ] && [ -f "${AWS_KEY_PATH}" ]; then
  SSH_KEY="${AWS_KEY_PATH}"
elif [ -f "$HOME/aws_keys/santkripa.pem" ]; then
  SSH_KEY="$HOME/aws_keys/santkripa.pem"
elif [ -f "$HOME/.ssh/santkripa.pem" ]; then
  SSH_KEY="$HOME/.ssh/santkripa.pem"
fi
SSH_USER="ubuntu"
SSH_HOST="3.6.49.120"
REMOTE_STAGING="/tmp/frontend-dist"
REMOTE_DEPLOY="/var/www/html/riceops"

# Environment variables for build
VITE_PUBLIC_BASE_PATH="${VITE_PUBLIC_BASE_PATH:-/}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.adhraamrit.com/api/v1}"

echo -e "${BLUE}=== Rice Ops Frontend Deployment ===${NC}\n"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}Error: SSH key not found.${NC}"
    echo -e "Set ${GREEN}SSH_KEY${NC} or ${GREEN}AWS_KEY_PATH${NC} to your PEM, or place the key at:"
    echo -e "  ${GREEN}~/aws_keys/santkripa.pem${NC}  or  ${GREEN}~/.ssh/santkripa.pem${NC}"
    exit 1
fi

echo -e "${BLUE}Using SSH key: ${SSH_KEY}${NC}\n"

# Step 1: Build
echo -e "${BLUE}[1/4] Building production bundle...${NC}"
cd "$PROJECT_DIR"
VITE_PUBLIC_BASE_PATH="$VITE_PUBLIC_BASE_PATH" \
VITE_API_BASE_URL="$VITE_API_BASE_URL" \
npm run build:deploy

if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Error: Build failed - dist/ directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}\n"

# Step 2: Prepare remote staging
echo -e "${BLUE}[2/4] Preparing remote staging directory...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" \
    "rm -rf $REMOTE_STAGING && mkdir -p $REMOTE_STAGING"

echo -e "${GREEN}✓ Remote staging prepared${NC}\n"

# Step 3: Upload build
echo -e "${BLUE}[3/4] Uploading build to server...${NC}"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r dist/* \
    "$SSH_USER@$SSH_HOST:$REMOTE_STAGING/"

echo -e "${GREEN}✓ Upload complete${NC}\n"

# Step 4: Deploy to Apache
echo -e "${BLUE}[4/4] Deploying to Apache...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" << 'EOF'
    set -e
    # Sync files to deployment directory
    sudo rsync -a --delete /tmp/frontend-dist/ /var/www/html/riceops/
    
    # Ensure .htaccess exists with SPA rewrite rules (rsync --delete removes it)
    sudo tee /var/www/html/riceops/.htaccess >/dev/null <<'HT'
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
HT
    
    # Set correct permissions for .htaccess
    sudo chown www-data:www-data /var/www/html/riceops/.htaccess
    sudo chmod 644 /var/www/html/riceops/.htaccess
    
    # Reload Apache to apply changes
    sudo systemctl reload apache2 || true
    
    # Verify .htaccess exists
    if [ -f /var/www/html/riceops/.htaccess ]; then
        echo "✓ .htaccess file created successfully"
    else
        echo "✗ Warning: .htaccess file not found after creation"
    fi
EOF

echo -e "${GREEN}✓ Deployment complete!${NC}\n"

echo -e "${GREEN}=== Deployment Summary ===${NC}"
echo -e "Base Path: ${VITE_PUBLIC_BASE_PATH}"
echo -e "API URL: ${VITE_API_BASE_URL}"
echo -e "Live URL: https://riceops.adhraamrit.com"
echo -e "\n${GREEN}Deployment successful! 🎉${NC}"

