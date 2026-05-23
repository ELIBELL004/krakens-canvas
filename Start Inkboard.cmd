@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  call npm.cmd install
  if errorlevel 1 exit /b %errorlevel%
)
start "" "%~dp0node_modules\.bin\electron.cmd" "%~dp0"
