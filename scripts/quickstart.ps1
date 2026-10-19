# Быстрый запуск для Windows: сборка фронтенда и старт Flask.
# Использование: powershell -ExecutionPolicy Bypass -File scripts\quickstart.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend"

# Чтобы Python-логи с кириллицей корректно печатались в консоли Windows.
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

Write-Host "== Печать героя: быстрый старт ==" -ForegroundColor Yellow

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $python) {
    throw "Python не найден. Установите Python 3.11+ и добавьте его в PATH."
}

if (-not (Test-Path (Join-Path $frontend "dist\index.html"))) {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        $npm = Get-Command npm -ErrorAction SilentlyContinue
    }
    if (-not $npm) {
        throw "Node.js и npm не найдены. Установите Node.js 20+ и добавьте его в PATH."
    }
    Write-Host "Собираем фронтенд..." -ForegroundColor Cyan
    Push-Location $frontend
    try {
        if (-not (Test-Path "node_modules")) {
            & $npm.Source install
            if ($LASTEXITCODE -ne 0) { throw "npm install завершился с ошибкой." }
        }
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { throw "Сборка фронтенда завершилась с ошибкой." }
    }
    finally {
        Pop-Location
    }
}

Push-Location $backend
try {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Создан backend\.env - при необходимости укажите свой DATABASE_URL." -ForegroundColor DarkYellow
    }

    Write-Host "Проверяем зависимости бэкенда..." -ForegroundColor Cyan
    & $python.Source -m pip install -r requirements.txt --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Не удалось установить зависимости из requirements.txt."
    }

    Write-Host "Запускаем сервер: http://127.0.0.1:5000" -ForegroundColor Green
    & $python.Source run.py
}
finally {
    Pop-Location
}
