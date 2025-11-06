Param(
    [switch]$NoSeed
)

function Write-Section($text) { Write-Host "`n==== $text ====\n" -ForegroundColor Cyan }
function Write-Step($text) { Write-Host "→ $text" -ForegroundColor Green }

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Section "Reset Database (migrate + seed)"

Push-Location (Join-Path $PSScriptRoot "..\backend")
Write-Step "Running migrations"
npm run migrate

if(-not $NoSeed){
  Write-Step "Seeding database"
  npm run seed
} else {
  Write-Step "Skipping seed (per flag)"
}

Pop-Location
Write-Section "Done"


