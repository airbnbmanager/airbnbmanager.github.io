@echo off
:: Self-elevate to Administrator if not already running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:: Run PowerShell optimization script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Optimize-Developer-PC.ps1"
