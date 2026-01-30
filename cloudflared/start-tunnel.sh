#!/bin/bash

# Cloudflare Tunnel Start Script
# This script starts the Cloudflare tunnel for the Storage Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Cloudflare Tunnel...${NC}"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Error: cloudflared is not installed${NC}"
    echo "Install it from: https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

# Check if config file exists
CONFIG_FILE="$HOME/.cloudflared/config.yml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Warning: Config file not found at $CONFIG_FILE${NC}"
    echo "Creating from example..."
    mkdir -p "$HOME/.cloudflared"
    cp cloudflared/config.yml "$CONFIG_FILE"
    echo -e "${YELLOW}Please edit $CONFIG_FILE with your tunnel ID and domain${NC}"
    exit 1
fi

# Check if backend is running
if ! curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Backend server not responding on http://localhost:8000${NC}"
    echo "Make sure the backend is running before starting the tunnel"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start tunnel
echo -e "${GREEN}Starting tunnel...${NC}"
cloudflared tunnel run storage-server
