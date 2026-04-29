#!/bin/bash
# Deploy script for rxwheel.com
# Usage: ./deploy.sh
#
# Before first use, edit DROPLET_USER and DROPLET_HOST below to match your droplet.

set -e

DROPLET_USER="root"
DROPLET_HOST="YOUR_DROPLET_IP"  # replace with your droplet IP or hostname
DROPLET_PATH="/var/www/rxwheel/"

echo "Building..."
npm run build

echo "Uploading to $DROPLET_USER@$DROPLET_HOST:$DROPLET_PATH"
rsync -avz --delete dist/ "$DROPLET_USER@$DROPLET_HOST:$DROPLET_PATH"

echo "Done. Visit https://rxwheel.com"
