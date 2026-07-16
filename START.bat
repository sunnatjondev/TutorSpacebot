@echo off
echo ========================================
echo    TutorSpace - Starting all services
echo ========================================
echo.

echo [1/3] Starting Mini App dev server...
start "TutorSpace App" cmd /k "cd /d "%~dp0tutorspace-app" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting HTTPS tunnel...
start "TutorSpace Tunnel" cmd /k "npx localtunnel --port 5173 --subdomain tutorspace-app"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Telegram Bot...
start "TutorSpace Bot" cmd /k "cd /d "%~dp0bot" && node index.js"

echo.
echo ========================================
echo  All services started!
echo  Mini App:  http://localhost:5173
echo  Tunnel:    https://tutorspace-app.loca.lt
echo  Bot:       @tut0rspacebot
echo ========================================
echo.
echo Note: First time visiting the tunnel URL,
echo you may need to click "Click to Continue".
echo.
pause
