@echo off
TITLE The Unique Haven Homes - WhatsApp Gateway
COLOR 0A

echo ================================================================
echo    THE UNIQUE HAVEN HOMES - WHATSAPP AUTOMATION GATEWAY
echo    Identity: The Unique Haven Homes (+91 9194109911)
echo ================================================================
echo.

:: 1. Change to bot directory
cd /d "%~dp0"

:: Ensure Node is in PATH if installed in standard location
if exist "C:\Program Files\nodejs\node.exe" set "PATH=%PATH%;C:\Program Files\nodejs"

:: 2. Check Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js LTS version from https://nodejs.org
    echo Then run this file again.
    pause
    exit /b 1
)

:: 3. Check and install dependencies if missing
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install npm packages. Check your internet connection.
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed!
    echo.
)

:: 4. Start Server with Auto-Restart on crash
echo [INFO] Starting WhatsApp Gateway on http://localhost:3000 ...
echo [INFO] To link WhatsApp: Open your browser at http://localhost:3000/qr
echo [INFO] To stop: Press Ctrl + C
echo.

:loop
node server.js
echo.
echo [WARNING] WhatsApp Gateway stopped or disconnected. Restarting in 5 seconds...
timeout /t 5 >nul
goto loop
