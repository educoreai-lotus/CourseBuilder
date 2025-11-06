Param(
    [switch]$Fresh,
    [switch]$NoSeed
)

function Write-Section($text) { Write-Host "`n==== $text ====\n" -ForegroundColor Cyan }
function Write-Step($text) { Write-Host "→ $text" -ForegroundColor Green }

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Section "Course Builder Dev Runner"

if($Fresh){
  Write-Step "Running bootstrap (env, install, migrate, seed)"
  $bootstrap = Join-Path $PSScriptRoot "bootstrap.ps1"
  if($NoSeed){
    & powershell -ExecutionPolicy Bypass -File $bootstrap -SkipSeed
  } else {
    & powershell -ExecutionPolicy Bypass -File $bootstrap
  }
}

Write-Section "Starting servers"

# Start Backend
$backendPath = Join-Path $PSScriptRoot "..\backend"
Write-Step "Starting backend (npm run dev)"
Start-Process powershell -ArgumentList "-NoLogo","-NoExit","-Command","cd `"$backendPath`"; npm run dev" | Out-Null

# Start Frontend
$frontendPath = Join-Path $PSScriptRoot "..\frontend"
Write-Step "Starting frontend (npm run dev)"
Start-Process powershell -ArgumentList "-NoLogo","-NoExit","-Command","cd `"$frontendPath`"; npm run dev" | Out-Null

Write-Host "`nBoth servers launched in new terminals." -ForegroundColor Yellow


