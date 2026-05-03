@echo off
title Sea Battle Server

cd /d "C:\Users\User\Desktop\battleship\server"

echo Installing dependencies (if needed)...
if not exist "node_modules\" (
    echo npm install...
    call npm install
)

echo Starting server...
start cmd /k npm start

echo Waiting 5 seconds...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo Ready!
exit