@echo off
echo ========================================
echo   Iniciando Disney+ Clone com Streaming
echo ========================================
echo.

echo [1/2] Iniciando backend (FastAPI)...
cd backend
start "Backend Skyflix" cmd /c "py -3.11 server.py"
cd ..

echo [2/2] Aguardando backend iniciar...
timeout /t 3 /nobreak >nul

echo [2/2] Iniciando frontend (Vite)...
start "Frontend Disney+" cmd /c "npm run dev"

echo.
echo ========================================
echo   Backend rodando em: http://localhost:8000
echo   Frontend rodando em: http://localhost:5173
echo ========================================
echo.
echo Pressione qualquer tecla para fechar ambos...
pause >nul
taskkill /FI "WINDOWTITLE eq Backend Skyflix*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend Disney+*" /F >nul 2>&1
