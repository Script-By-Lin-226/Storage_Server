# Cloudflare Tunnel Start Script for Windows PowerShell
# This script starts the Cloudflare tunnel for the Storage Server

$ErrorActionPreference = "Stop"

Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Green

# Check if cloudflared is installed
try {
    $null = Get-Command cloudflared -ErrorAction Stop
} catch {
    Write-Host "Error: cloudflared is not installed" -ForegroundColor Red
    Write-Host "Install it from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Check if config file exists
$ConfigFile = "$env:USERPROFILE\.cloudflared\config.yml"
if (-not (Test-Path $ConfigFile)) {
    Write-Host "Warning: Config file not found at $ConfigFile" -ForegroundColor Yellow
    Write-Host "Creating from example..."
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cloudflared" | Out-Null
    Copy-Item "cloudflared\config.yml.example" $ConfigFile
    Write-Host "Please edit $ConfigFile with your tunnel ID and domain" -ForegroundColor Yellow
    exit 1
}

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Host "Warning: Backend server not responding on http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Make sure the backend is running before starting the tunnel"
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Start tunnel
Write-Host "Starting tunnel..." -ForegroundColor Green
cloudflared tunnel run storage-server
