# make-web.ps1 — assembles a clean web/ folder for deployment (drag-and-drop)
# Usage:  cd C:\dev\pagia-baair ; .\make-web.ps1
# Output: web\  — contains ONLY the files a browser needs (no Electron, no docs, no node_modules)

$root = $PSScriptRoot
$web  = Join-Path $root "web"

if (Test-Path $web) { Remove-Item $web -Recurse -Force }
New-Item -ItemType Directory -Path $web | Out-Null

# netlify.toml is intentionally absent: it lives at the repo root (publish = "web").
# Copying it in here would make a drag-and-drop deploy of web/ look for web/web.
$files = @(
  "index.html","style.css",
  "config.js","i18n.js","app.js","feed-extras.js","settings.js","auth.js","backend.js",
  "manifest.json","robots.txt"
)
foreach ($f in $files) {
  if (Test-Path (Join-Path $root $f)) { Copy-Item (Join-Path $root $f) $web }
  else { Write-Host "  (skip, missing: $f)" -ForegroundColor Yellow }
}
Copy-Item (Join-Path $root "images") (Join-Path $web "images") -Recurse

$count = (Get-ChildItem $web -Recurse -File).Count
Write-Host ""
Write-Host "  web\ ready — $count files. Drag this folder to Netlify Drop." -ForegroundColor Green
Write-Host "  https://app.netlify.com/drop" -ForegroundColor Cyan
Write-Host ""
