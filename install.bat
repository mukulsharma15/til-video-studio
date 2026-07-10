@echo off
REM Double-click this ONCE to install everything Indic League Studio needs.
REM Safe to run more than once - it skips anything already installed.
cd /d "%~dp0"

echo ============================================
echo   Indic League Studio - one-time setup
echo ============================================
echo.

where winget >nul 2>nul
if errorlevel 1 (
  echo winget was not found on this PC.
  echo Please install Python, Node.js, and ffmpeg manually - see README.md for links.
  pause
  exit /b 1
)

echo Installing Python, Node.js, and ffmpeg (skips anything already installed)...
winget install -e --id Python.Python.3.12
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Gyan.FFmpeg

echo.
echo -- Checking versions (you may need to close and reopen this window once) --
python --version 2>nul
node --version 2>nul
ffmpeg -version 2>nul

echo.
echo Setup complete. Now double-click start.bat to open the studio.
echo (If a command above said "not recognized", close this window, reopen it, and run install.bat again.)
echo.
pause
