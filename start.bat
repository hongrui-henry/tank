@echo off
cd /d "%~dp0server"
echo ========================================
echo   Neon Tank Battle - 启动中...
echo ========================================
echo.
echo 游戏将在浏览器中自动打开
echo 如果未自动打开，请访问:
echo   http://localhost:3000
echo.
node index.js
pause
