@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Pagia BaIr - building clean web folder...
echo ============================================
echo.

if exist web rmdir /s /q web
mkdir web

for %%F in (index.html style.css config.js i18n.js app.js feed-extras.js settings.js auth.js backend.js manifest.json robots.txt netlify.toml) do (
  if exist "%%F" (copy /y "%%F" "web\" >nul) else (echo   missing: %%F)
)
xcopy /e /i /y images "web\images" >nul

echo.
echo   Done. The "web" folder is ready ^(app only, no node_modules^).
echo.
echo   Two windows are opening:
echo     1^) Netlify Drop  ^(the website^)
echo     2^) This folder   ^(File Explorer^)
echo.
echo   >>> Drag the "web" folder into the Netlify page. That's it. <<<
echo.

start "" https://app.netlify.com/drop
start "" "%~dp0"

echo   Press any key to close this window.
pause >nul
