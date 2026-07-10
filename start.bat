@echo off
REM Double-click this file (Windows) to start the local render server and open the studio.
cd /d "%~dp0"
if not defined PORT set PORT=8000
start "" "http://localhost:%PORT%/studio.html"
where py >nul 2>nul && ( py server.py & goto :eof )
python server.py
