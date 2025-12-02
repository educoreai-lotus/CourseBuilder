# Git Push Script - Captures output to verify execution
# Run this script manually: .\git-push-changes.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project directory
Set-Location "C:\Users\HP\Desktop\MainDevelopment_tamplates"

# Show current status
Write-Host "1. Checking git status..." -ForegroundColor Yellow
git status --short | Out-String | Write-Host
Write-Host ""

# Show what files have changed
Write-Host "2. Checking modified files..." -ForegroundColor Yellow
git diff --name-only | Out-String | Write-Host
Write-Host ""

# Stage all changes
Write-Host "3. Staging all changes..." -ForegroundColor Yellow
git add backend/force-fill-db.js
git add backend/scripts/push-data-to-supabase.js
git add backend/package.json
Write-Host "   Files staged" -ForegroundColor Green
Write-Host ""

# Show staged files
Write-Host "4. Staged files:" -ForegroundColor Yellow
git status --short | Out-String | Write-Host
Write-Host ""

# Commit changes
Write-Host "5. Committing changes..." -ForegroundColor Yellow
git commit -m "Add scripts to push data to Supabase" 2>&1 | Out-String | Write-Host
Write-Host ""

# Show last commit
Write-Host "6. Last commit:" -ForegroundColor Yellow
git log --oneline -1 | Out-String | Write-Host
Write-Host ""

# Push to remote
Write-Host "7. Pushing to GitHub..." -ForegroundColor Yellow
git push 2>&1 | Out-String | Write-Host
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Script completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan


