# DSH Desktop - Push to GitHub
# Run this script after setting up your git credentials

$REPO_URL = "https://github.com/jsshwqz/deepseek-harness.git"
$APP_DIR = "apps/dsh-desktop"

Write-Host "=== DSH Desktop Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Create the GitHub repo
Write-Host "Creating GitHub repository..." -ForegroundColor Yellow
gh repo create jsshwqz/deepseek-harness --public --description "Multi-platform desktop client for DeepSeek Harness - Electron + React + TypeScript" 2>&1

# Initialize git in the workspace
Write-Host "Initializing git repository..." -ForegroundColor Yellow
git init D:\test\deepseek
git -C D:\test\deepseek remote add origin $REPO_URL
git -C D:\test\deepseek branch -M main

# Add the desktop app files
Write-Host "Staging files..." -ForegroundColor Yellow
git -C D:\test\deepseek add $APP_DIR/

# Commit
git -C D:\test\deepseek commit -m "feat: add DSH Desktop - multi-platform Electron client for DeepSeek Harness"

# Push
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git -C D:\test\deepseek push -u origin main

Write-Host ""
Write-Host "Done! App is live at: https://github.com/jsshwqz/deepseek-harness" -ForegroundColor Green
