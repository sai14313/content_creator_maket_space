# Starts the CreatorAI frontend (Vite dev server) on http://localhost:5173
$ErrorActionPreference = "Stop"
$frontend = Join-Path (Split-Path $PSScriptRoot -Parent) "frontend"

# Prefer npm.cmd (PowerShell execution policy may block npm.ps1 shims).
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
    $portable = Join-Path $env:LOCALAPPDATA "Programs\nodejs\npm.cmd"
    if (Test-Path $portable) { $npm = $portable }
}
if (-not $npm) {
    Write-Host "npm not found. Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Set-Location $frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first run)..." -ForegroundColor Cyan
    & $npm install --no-fund --no-audit
}

Write-Host "Starting Vite on http://localhost:5173" -ForegroundColor Green
& $npm run dev
