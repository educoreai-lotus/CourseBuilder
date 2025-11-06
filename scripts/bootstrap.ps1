Param(
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "coursebuilder",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "postgres",
    [string]$FrontendPort = "5173",
    [switch]$SkipSeed
)

function Write-Section($text) { Write-Host "`n==== $text ====\n" -ForegroundColor Cyan }
function Write-Step($text) { Write-Host "→ $text" -ForegroundColor Green }
function Ensure-Directory($path) { if(!(Test-Path $path)){ New-Item -ItemType Directory -Force -Path $path | Out-Null } }

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Section "Course Builder Bootstrap"

# 1) Generate backend/.env
Write-Step "Generating backend/.env"
$backendEnvPath = Join-Path $PSScriptRoot "..\backend\.env"
Ensure-Directory (Split-Path $backendEnvPath)
@"
DB_HOST=${DbHost}
DB_PORT=${DbPort}
DB_NAME=${DbName}
DB_USER=${DbUser}
DB_PASSWORD=${DbPassword}
DATABASE_URL=postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}

PORT=3000
NODE_ENV=development

API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:${FrontendPort}
CORS_ORIGIN=http://localhost:${FrontendPort}
"@ | Set-Content -NoNewline -Path $backendEnvPath

# 2) Generate frontend/.env
Write-Step "Generating frontend/.env"
$frontendEnvPath = Join-Path $PSScriptRoot "..\frontend\.env"
Ensure-Directory (Split-Path $frontendEnvPath)
@"
VITE_API_URL=http://localhost:3000/api/v1
VITE_ENV=development
"@ | Set-Content -NoNewline -Path $frontendEnvPath

# 3) Install dependencies (backend, frontend)
Write-Section "Installing dependencies"
Write-Step "Backend dependencies"
Push-Location (Join-Path $PSScriptRoot "..\backend")
npm install
Pop-Location

Write-Step "Frontend dependencies"
Push-Location (Join-Path $PSScriptRoot "..\frontend")
npm install
Pop-Location

# 4) Migrate DB (and seed optionally)
Write-Section "Database migration"
Push-Location (Join-Path $PSScriptRoot "..\backend")
npm run migrate
if(-not $SkipSeed){
  Write-Step "Seeding database"
  npm run seed
} else {
  Write-Step "Skipping seed (per flag)"
}
Pop-Location

Write-Section "Bootstrap complete"
Write-Host "Use scripts/dev.ps1 to start both servers." -ForegroundColor Yellow


