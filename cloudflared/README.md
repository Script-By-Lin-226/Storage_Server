# Cloudflare Tunnel Configuration

This directory contains configuration files and scripts for setting up Cloudflare Tunnel.

## Files

- `config.yml.example` - Example configuration file
- `start-tunnel.sh` - Linux/macOS start script
- `start-tunnel.ps1` - Windows PowerShell start script
- `install-service.sh` - Install as systemd service (Linux)

## Quick Start

1. **Copy example config:**
   ```bash
   # Linux/macOS
   mkdir -p ~/.cloudflared
   cp cloudflared/config.yml ~/.cloudflared/config.yml
   
   # Windows
   mkdir %USERPROFILE%\.cloudflared
   copy cloudflared\config.yml.example %USERPROFILE%\.cloudflared\config.yml
   ```

2. **Edit config with your tunnel ID and domain**

3. **Start tunnel:**
   ```bash
   # Linux/macOS
   chmod +x cloudflared/start-tunnel.sh
   ./cloudflared/start-tunnel.sh
   
   # Windows
   .\cloudflared\start-tunnel.ps1
   ```

## Installation as Service

### Linux (Systemd)

```bash
sudo chmod +x cloudflared/install-service.sh
sudo ./cloudflared/install-service.sh
sudo systemctl start cloudflared
```

### Windows (Service)

```powershell
cloudflared service install
net start cloudflared
```

## Configuration

Edit `~/.cloudflared/config.yml` (or `%USERPROFILE%\.cloudflared\config.yml` on Windows):

1. Replace `<YOUR_TUNNEL_ID>` with your tunnel ID
2. Replace `api.yourdomain.com` with your API subdomain
3. Replace `yourdomain.com` with your main domain
4. Adjust ports if needed (default: 8000 for API, 3000 for frontend)

## Troubleshooting

See `CLOUDFLARE_TUNNEL_SETUP.md` in the root directory for detailed troubleshooting.
