@echo off
chcp 65001 >nul
cls

:: ╔══════════════════════════════════════════════════════════════╗
:: ║           SaaS Factory — Setup Wizard v1.0 (Windows)        ║
:: ╚══════════════════════════════════════════════════════════════╝

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║         SaaS Factory — Setup Wizard                 ║
echo  ║         Automatska instalacija i konfiguracija      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Trebat ce ti:
echo   - Anthropic API kljuc  ^>  console.anthropic.com
echo   - Supabase projekat    ^>  supabase.com
echo.
pause

:: ── Korak 1: Provjera sistema ─────────────────────────────────
echo.
echo [1/6] Provjera sistema...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [GRESKA] Node.js nije instaliran!
  echo Idi na https://nodejs.org i instaliraj Node.js 18+
  pause
  exit /b 1
)
echo [OK] Node.js pronađen

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] pnpm nije pronađen. Instaliram...
  npm install -g pnpm
)
echo [OK] pnpm pronađen

:: ── Korak 2: Anthropic API ključ ──────────────────────────────
echo.
echo [2/6] Anthropic API kljuc (Claude AI)
echo.
echo  Kako dobiti kljuc:
echo  1. Idi na https://console.anthropic.com
echo  2. Registruj se i klikni "API Keys"
echo  3. Klikni "Create Key" i kopiraj kljuc
echo  4. Kljuc izgleda ovako: sk-ant-api03-...
echo.
set /p ANTHROPIC_KEY="Upiši Anthropic API kljuc: "

:: ── Korak 3: Supabase ─────────────────────────────────────────
echo.
echo [3/6] Supabase konfiguracija
echo.
echo  Kako dobiti kljuceve:
echo  1. Idi na https://supabase.com i napravi projekat
echo  2. Idi na Settings ^> API
echo  3. Kopiraj Project URL, anon i service_role kljuceve
echo.
set /p SUPABASE_URL="Supabase Project URL (https://xxxx.supabase.co): "
set /p SUPABASE_ANON_KEY="Supabase anon public kljuc: "
set /p SUPABASE_SERVICE_ROLE_KEY="Supabase service_role kljuc: "

:: ── Korak 4: Opcionalni ključevi ──────────────────────────────
echo.
echo [4/6] Opcionalni kljucevi (pritisni ENTER za preskakanje)
echo.
set /p VOYAGE_KEY="Voyage AI kljuc (voyageai.com): "
set /p STRIPE_SECRET="Stripe Secret Key (dashboard.stripe.com): "
set /p RESEND_KEY="Resend API Key (resend.com): "

:: ── Korak 5: Kreiranje .env.local ─────────────────────────────
echo.
echo [5/6] Kreiranje konfiguracije...

set ENV_FILE=%~dp0.env.local

(
echo # SaaS Factory — Konfiguracija
echo # Generisano automatski sa setup.bat wizardom
echo.
echo # Anthropic ^(Claude AI^)
echo ANTHROPIC_API_KEY=%ANTHROPIC_KEY%
echo.
echo # Supabase
echo SUPABASE_URL=%SUPABASE_URL%
echo SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY%
echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%
echo.
echo # Voyage AI
echo VOYAGE_API_KEY=%VOYAGE_KEY%
echo.
echo # Stripe
echo STRIPE_SECRET_KEY=%STRIPE_SECRET%
echo STRIPE_PUBLISHABLE_KEY=
echo.
echo # Resend
echo RESEND_API_KEY=%RESEND_KEY%
echo.
echo # App
echo NODE_ENV=development
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
) > "%ENV_FILE%"

copy "%ENV_FILE%" "%~dp0factory-dashboard\.env.local" >nul 2>&1
echo [OK] .env.local kreiran

:: ── Korak 6: Instalacija i build ──────────────────────────────
echo.
echo [6/6] Instalacija i build...
echo.

cd /d "%~dp0"
echo Instaliram dependencies...
call pnpm install
echo [OK] Dependencies instalirane

echo Budujem factory-brain...
cd /d "%~dp0factory-brain"
call bash build.sh 2>nul || call pnpm build
echo [OK] factory-brain buildovan

echo Budujem factory-cli...
cd /d "%~dp0blocks\factory-cli"
call pnpm build
echo [OK] factory-cli buildovan

:: ── Kreiranje factory.bat komande ─────────────────────────────
cd /d "%~dp0"
(
echo @echo off
echo node "%~dp0blocks\factory-cli\dist\cli.js" %%*
) > "%~dp0factory.bat"

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          Setup završen uspješno!                     ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Kako koristiti:
echo.
echo  Lista svih nisa:
echo    factory niche-list
echo.
echo  Generisanje SaaS-a:
echo    factory generate --niche "teretana-crm" --name moj-gym
echo.
echo  Pokretanje Dashboarda:
echo    cd factory-dashboard ^&^& pnpm dev
echo.
pause
