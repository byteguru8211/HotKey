# Быстрый запуск для Windows: сборка фронтенда и старт Flask.
# Использование: powershell -ExecutionPolicy Bypass -File scripts\quickstart.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== Печать героя: быстрый старт ==" -ForegroundColor Yellow

if (-not (Test-Path (Join-Path $root "frontend\dist\index.html"))) {
    Write-Host "Собираем фронтенд..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "frontend")
    if (-not (Test-Path "node_modules")) { npm install }
    npm run build
    Pop-Location
}

Push-Location (Join-Path $root "backend")
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Создан backend\.env — при необходимости укажите свой DATABASE_URL." -ForegroundColor DarkYellow
}

python -m pip install -r requirements.txt --quiet
Write-Host "Запускаем сервер на http://127.0.0.1:5000" -ForegroundColor Green
python run.py
Pop-Location
