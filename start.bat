@echo off
REM Startskript for Ditec Inkorg (Windows). Dubbelklicka pa denna fil.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js saknas pa datorn.
  echo Ladda ner och installera "LTS" fran https://nodejs.org
  echo Kor sedan denna fil igen.
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo Installerar programmet forsta gangen. Detta kan ta nagra minuter...
  call npm install
)

if not exist .env.local (
  copy .env.example .env.local >nul
  echo.
  echo En installningsfil oppnas nu i Anteckningar.
  echo Fyll i ditt e-postlosenord vid IMAP_PASSWORD, spara ^(Ctrl+S^) och stang fonstret.
  echo.
  notepad .env.local
)

REM Bygg alltid sa att senaste koden kors (undviker gammal cache)
echo Forbereder appen ^(bygger senaste versionen^)...
call npm run build

echo.
echo Startar appen... En webblasare oppnas strax pa http://localhost:3000
echo Lat detta fonster vara oppet sa lange du anvander appen.
echo.
start "" http://localhost:3000
call npm run start
