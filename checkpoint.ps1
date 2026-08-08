# checkpoint.ps1 — One-click project backup
# Usage:  cd C:\dev\pagia-baair ; .\checkpoint.ps1
# Creates: backups\pagia-baair_YYYY-MM-DD_HHmm.zip  (excludes node_modules & backups)

$root  = $PSScriptRoot
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$bdir  = Join-Path $root "backups"
$zip   = Join-Path $bdir "pagia-baair_$stamp.zip"

New-Item -ItemType Directory -Force -Path $bdir | Out-Null

$items = Get-ChildItem $root -Force |
  Where-Object { $_.Name -notin @("node_modules", "backups", ".git") }

Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $zip -Force

$size = [math]::Round((Get-Item $zip).Length / 1KB)
Write-Host ""
Write-Host "  Checkpoint saved:  $zip  ($size KB)" -ForegroundColor Green
Write-Host ""
Get-ChildItem $bdir | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, LastWriteTime | Format-Table
