# Push script to verify and push changes to GitHub
Write-Host "Checking git status..." -ForegroundColor Cyan
git status

Write-Host "`nChecking branch..." -ForegroundColor Cyan
git branch --show-current

Write-Host "`nChecking remotes..." -ForegroundColor Cyan
git remote -v

Write-Host "`nStaging all changes..." -ForegroundColor Cyan
git add -A

Write-Host "`nChecking what will be committed..." -ForegroundColor Cyan
git status --short

Write-Host "`nCommitting changes..." -ForegroundColor Cyan
git commit -m "feat: AI-based topic and module structure generation" --allow-empty

Write-Host "`nPushing to origin master..." -ForegroundColor Cyan
git push origin master

Write-Host "`nPushing to SanaMohanna1 repository..." -ForegroundColor Cyan
git push https://github.com/SanaMohanna1/course_builder_fs.git master

Write-Host "`nDone!" -ForegroundColor Green
