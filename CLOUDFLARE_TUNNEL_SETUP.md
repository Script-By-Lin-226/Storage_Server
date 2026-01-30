# Cloudflare Tunnel Setup Guide

This guide will help you set up Cloudflare Tunnel (formerly Argo Tunnel) to expose your Storage Server to the internet securely without opening ports on your firewall.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) (free tier works)
2. **Domain**: A domain managed by Cloudflare DNS
3. **Cloudflared**: The Cloudflare Tunnel client

## Step 1: Install Cloudflared

### Windows

1. Download from: https://github.com/cloudflare/cloudflared/releases
2. Extract `cloudflared.exe` to a folder (e.g., `C:\cloudflared\`)
3. Add to PATH or use full path

Or use Chocolatey:
```powershell
choco install cloudflared
```

### Linux

```bash
# Debian/Ubuntu
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Or using package manager
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

### macOS

```bash
brew install cloudflared
```

## Step 2: Authenticate with Cloudflare

Run the authentication command:

```bash
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select your Cloudflare account
3. Authorize the tunnel
4. Save credentials to `~/.cloudflared/cert.pem`

## Step 3: Create a Tunnel

Create a new tunnel with a name (e.g., `storage-server`):

```bash
cloudflared tunnel create storage-server
```

This will:
- Create a tunnel in your Cloudflare account
- Generate a UUID for the tunnel
- Save tunnel credentials

**Note the Tunnel ID** that's displayed (you'll need it for configuration).

## Step 4: Configure the Tunnel

Create a configuration file at `~/.cloudflared/config.yml` (or `%USERPROFILE%\.cloudflared\config.yml` on Windows):

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Backend API
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  
  # Frontend (if serving static files)
  - hostname: yourdomain.com
    service: http://localhost:3000
  
  # Catch-all rule (must be last)
  - service: http_status:404
```

**Replace:**
- `<YOUR_TUNNEL_ID>` with your actual tunnel ID
- `api.yourdomain.com` with your API subdomain
- `yourdomain.com` with your main domain

### Alternative: Quick Tunnel (Temporary)

For quick testing without configuration:

```bash
# Backend API
cloudflared tunnel --url http://localhost:8000

# Frontend (in another terminal)
cloudflared tunnel --url http://localhost:3000
```

This gives you temporary URLs like `https://random-name.trycloudflare.com`

## Step 5: Create DNS Records

Create DNS records in Cloudflare Dashboard:

1. Go to your domain in Cloudflare Dashboard
2. Navigate to **DNS** > **Records**
3. Add records:

   **For API:**
   - Type: `CNAME`
   - Name: `api` (or your subdomain)
   - Target: `<TUNNEL_ID>.cfargotunnel.com`
   - Proxy: ✅ Proxied (orange cloud)

   **For Frontend:**
   - Type: `CNAME`
   - Name: `@` (root domain) or `www`
   - Target: `<TUNNEL_ID>.cfargotunnel.com`
   - Proxy: ✅ Proxied (orange cloud)

## Step 6: Run the Tunnel

### Option 1: Run Directly

```bash
cloudflared tunnel run storage-server
```

### Option 2: Run as Service (Recommended for Production)

#### Windows (Service)

1. Create service:
```powershell
cloudflared service install
```

2. Start service:
```powershell
net start cloudflared
```

#### Linux (Systemd)

1. Create service file `/etc/systemd/system/cloudflared.service`:

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=your-user
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/your-user/.cloudflared/config.yml run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

#### macOS (LaunchDaemon)

1. Create plist file `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--config</string>
        <string>/Users/your-user/.cloudflared/config.yml</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

2. Load and start:
```bash
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo launchctl start com.cloudflare.cloudflared
```

## Step 7: Update Application Configuration

### Backend (FastAPI)

Update `app/app.py` to include your Cloudflare domain in CORS:

```python
allowed_origins = [
    "http://localhost:3000",
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://api.yourdomain.com",
    # ... other origins
]
```

### Frontend

Update `frontend/src/context/AuthContext.jsx` if using environment variable:

```javascript
const apiBase = import.meta.env.VITE_API_URL || 'https://api.yourdomain.com'
```

Or set environment variable:
```bash
# .env
VITE_API_URL=https://api.yourdomain.com
```

## Step 8: Verify Setup

1. **Check Tunnel Status:**
   ```bash
   cloudflared tunnel list
   cloudflared tunnel info storage-server
   ```

2. **Test Backend:**
   ```bash
   curl https://api.yourdomain.com/
   ```

3. **Test Frontend:**
   Open `https://yourdomain.com` in browser

## Troubleshooting

### Tunnel Not Connecting

1. **Check tunnel is running:**
   ```bash
   cloudflared tunnel list
   ```

2. **Check logs:**
   ```bash
   # Windows
   Get-Content $env:USERPROFILE\.cloudflared\*.log
   
   # Linux/macOS
   tail -f ~/.cloudflared/*.log
   ```

3. **Verify DNS records:**
   - Ensure CNAME records point to `<TUNNEL_ID>.cfargotunnel.com`
   - Ensure proxy is enabled (orange cloud)

### Connection Refused

- Ensure your local server is running on the correct port
- Check firewall isn't blocking localhost connections
- Verify the service URL in `config.yml` matches your server

### SSL/TLS Issues

- Cloudflare Tunnel automatically handles SSL
- Ensure DNS records are proxied (orange cloud)
- Wait a few minutes for DNS propagation

### Multiple Services

If you need to route multiple services:

```yaml
ingress:
  # API routes
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  
  # Frontend routes
  - hostname: yourdomain.com
    path: /api/*
    service: http://localhost:8000
  
  - hostname: yourdomain.com
    service: http://localhost:3000
  
  # Catch-all
  - service: http_status:404
```

## Security Best Practices

1. **Keep tunnel credentials secure:**
   - Don't commit `cert.pem` or tunnel JSON files to git
   - Use proper file permissions (600)

2. **Use Cloudflare Access (Optional):**
   - Add authentication layer before your app
   - Configure in Cloudflare Dashboard > Access

3. **Enable WAF Rules:**
   - Configure Web Application Firewall in Cloudflare Dashboard
   - Set up rate limiting

4. **Monitor Traffic:**
   - Use Cloudflare Analytics to monitor traffic
   - Set up alerts for unusual activity

## Advanced Configuration

### Load Balancing

For multiple tunnel instances:

```yaml
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
    originRequest:
      noHappyEyeballs: true
      keepAliveConnections: 10
      keepAliveTimeout: 90s
```

### Custom Headers

```yaml
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
    originRequest:
      httpHostHeader: api.yourdomain.com
      noTLSVerify: false
```

### Compression

```yaml
ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
    originRequest:
      compressionQuality: 0
```

## Quick Reference Commands

```bash
# List tunnels
cloudflared tunnel list

# Create tunnel
cloudflared tunnel create <name>

# Delete tunnel
cloudflared tunnel delete <name>

# Run tunnel
cloudflared tunnel run <name>

# Route DNS
cloudflared tunnel route dns <tunnel-name> <hostname>

# View tunnel info
cloudflared tunnel info <name>

# Check tunnel status
cloudflared tunnel list
```

## Next Steps

1. ✅ Set up monitoring and alerts
2. ✅ Configure Cloudflare Access (optional)
3. ✅ Set up WAF rules
4. ✅ Enable caching rules for static assets
5. ✅ Configure rate limiting
6. ✅ Set up SSL/TLS settings (Full mode recommended)

## Support

- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Community: https://community.cloudflare.com/
