@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$path = Join-Path '%~dp0' 'index.html'; $uri = [System.Uri]::new($path).AbsoluteUri; Start-Process msedge -ArgumentList @('--app=' + $uri, '--new-window')"
