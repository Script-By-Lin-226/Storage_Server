#!/bin/bash

# Install Cloudflare Tunnel as Systemd Service
# Run with sudo

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "Installing Cloudflare Tunnel as systemd service..."

# Get the current user (who ran sudo)
REAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~$REAL_USER)

# Create service file
cat > /etc/systemd/system/cloudflared.service << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=$REAL_USER
ExecStart=/usr/local/bin/cloudflared tunnel --config $USER_HOME/.cloudflared/config.yml run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable cloudflared

echo "Service installed and enabled!"
echo "Start with: sudo systemctl start cloudflared"
echo "Check status with: sudo systemctl status cloudflared"
echo "View logs with: sudo journalctl -u cloudflared -f"
