# Starts the CreatorAI backend (FastAPI + Uvicorn) with venv auto-detection.
$ErrorActionPreference = "Stop"
$backend = Join-Path (Split-Path $PSScriptRoot -Parent) "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv (Join-Path $backend ".venv")
}

if (-not (Test-Path (Join-Path $backend "creatorai.db"))) {
    Write-Host "Seeding database..." -ForegroundColor Cyan
    & $python (Join-Path $backend "seed.py")
}

Write-Host "Starting FastAPI on http://127.0.0.1:8000 (docs: /docs)" -ForegroundColor Green
Set-Location $backend
& $python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
