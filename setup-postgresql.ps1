# Run this script as Administrator (right-click PowerShell -> Run as administrator)
# Sets up PostgreSQL 17 for the MediCare GH Pharmacy POS app

$ErrorActionPreference = "Stop"
$pgRoot = "C:\Program Files\PostgreSQL\17"
$pgBin = "$pgRoot\bin"
$pgData = "$pgRoot\data"
$serviceName = "postgresql-x64-17"
$password = "password"

Write-Host "=== PostgreSQL Setup for Pharmacy POS ===" -ForegroundColor Cyan

if (-not (Test-Path "$pgBin\psql.exe")) {
    Write-Host "PostgreSQL binaries not found. Install with:" -ForegroundColor Red
    Write-Host 'winget install PostgreSQL.PostgreSQL.17 --accept-package-agreements --accept-source-agreements --override "--mode unattended --superpassword password --servicename postgresql-x64-17 --serviceaccount postgres --serverport 5432"'
    exit 1
}

if (-not (Test-Path $pgData)) {
    Write-Host "Initializing database cluster..." -ForegroundColor Yellow
    $pwFile = "$env:TEMP\pg_pw.txt"
    Set-Content -Path $pwFile -Value $password -NoNewline
    & "$pgBin\initdb.exe" -U postgres -A scram-sha-256 --pwfile=$pwFile -E UTF8 -D $pgData
    Remove-Item $pwFile -Force -ErrorAction SilentlyContinue
    Write-Host "Database cluster initialized." -ForegroundColor Green
} else {
    Write-Host "Data directory already exists." -ForegroundColor Green
}

$existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Registering Windows service..." -ForegroundColor Yellow
    & "$pgBin\pg_ctl.exe" register -N $serviceName -D $pgData -S auto
}

Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
Start-Service $serviceName
Set-Service $serviceName -StartupType Automatic

Write-Host "Creating pharmacy_pos database..." -ForegroundColor Yellow
$env:PGPASSWORD = $password
& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -c "SELECT 1 FROM pg_database WHERE datname = 'pharmacy_pos'" -t | ForEach-Object {
    if ($_.Trim() -ne "1") {
        & "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE pharmacy_pos;"
    }
}

Write-Host ""
Write-Host "PostgreSQL is ready!" -ForegroundColor Green
Write-Host "  Host:     localhost"
Write-Host "  Port:     5432"
Write-Host "  User:     postgres"
Write-Host "  Password: password"
Write-Host "  Database: pharmacy_pos"
Write-Host ""
Write-Host "Next, in your project folder run:" -ForegroundColor Cyan
Write-Host "  cd c:\Users\Patience\Desktop\pos--c"
Write-Host "  npm run install:all"
Write-Host "  npm run db:setup"
Write-Host "  npm run dev"
