@echo off
setlocal EnableExtensions

title TeknoLikha CLI Installer

echo.
echo ========================================
echo       TEKNOLIKHA CLI INSTALLER
echo ========================================
echo.


REM ========================================
REM CONFIGURATION
REM ========================================

set "DEST=C:\teknolikha"
set "SOURCE=%~dp0."

echo Source:
echo "%~dp0"

echo.
echo Destination:
echo "%DEST%"

echo.


REM ========================================
REM CHECK NODE.JS
REM ========================================

echo ========================================
echo [1/5] Checking Node.js
echo ========================================
echo.

where node >nul 2>&1

if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo.
    echo Please install Node.js first.
    echo.
    pause
    exit /b 1
)

node --version

echo.


REM ========================================
REM CHECK NPM
REM ========================================

where npm.cmd >nul 2>&1

if errorlevel 1 (
    echo ERROR: npm is not installed.
    echo.
    pause
    exit /b 1
)

echo npm:
call npm.cmd --version

echo.


REM ========================================
REM CHECK PACKAGE.JSON
REM ========================================

if not exist "%SOURCE%\package.json" (

    echo ERROR: package.json was not found.
    echo.

    echo The installer must be located
    echo inside the TeknoLikha project folder.
    echo.

    echo Expected:
    echo.
    echo   install.bat
    echo   package.json
    echo   index.js
    echo   commands\
    echo   profiles\
    echo.

    pause
    exit /b 1
)


REM ========================================
REM CHECK IF ALREADY C:\teknolikha
REM ========================================

if /I "%~dp0"=="C:\teknolikha\" (

    echo ========================================
    echo Project is already in C:\teknolikha
    echo ========================================
    echo.

    goto INSTALL_DEPENDENCIES
)


REM ========================================
REM CREATE DESTINATION
REM ========================================

echo ========================================
echo [2/5] Preparing C:\teknolikha
echo ========================================
echo.

if not exist "%DEST%" (

    echo Creating:
    echo %DEST%

    mkdir "%DEST%"

    if errorlevel 1 (
        echo.
        echo ERROR: Cannot create C:\teknolikha
        echo.
        pause
        exit /b 1
    )
)

echo.


REM ========================================
REM COPY PROJECT
REM ========================================

echo ========================================
echo [3/5] Copying project
echo ========================================
echo.

echo From:
echo "%~dp0"

echo.
echo To:
echo "%DEST%"

echo.


REM Use Robocopy
REM
REM /E     = copy all subdirectories
REM /XD    = exclude node_modules
REM /R:2   = retry twice
REM /W:1   = wait one second
REM

robocopy "%~dp0." "%DEST%" /E /XD "%~dp0node_modules" "%DEST%\node_modules" /R:2 /W:1

set "RC=%ERRORLEVEL%"


REM Robocopy codes 0-7 are successful.
if %RC% GEQ 8 (

    echo.
    echo ========================================
    echo ERROR: Copy failed
    echo ========================================
    echo.

    echo Robocopy exit code: %RC%

    echo.
    echo Source:
    echo "%~dp0."

    echo.
    echo Destination:
    echo "%DEST%"

    echo.

    pause
    exit /b 1
)

echo.
echo Project copied successfully.
echo.


REM ========================================
REM INSTALL DEPENDENCIES
REM ========================================

:INSTALL_DEPENDENCIES

echo ========================================
echo [4/5] Installing npm dependencies
echo ========================================
echo.

cd /d "%DEST%"

if errorlevel 1 (

    echo ERROR: Cannot access:
    echo %DEST%

    echo.
    pause

    exit /b 1
)


echo Current directory:
cd

echo.


call npm.cmd install

if errorlevel 1 (

    echo.
    echo ========================================
    echo ERROR: npm install failed
    echo ========================================
    echo.

    pause

    exit /b 1
)

echo.
echo npm dependencies installed successfully.
echo.


REM ========================================
REM GLOBAL INSTALL
REM ========================================

echo ========================================
echo [5/5] Installing TeknoLikha globally
echo ========================================
echo.

call npm.cmd install -g .

if errorlevel 1 (

    echo.
    echo ========================================
    echo ERROR: Global installation failed
    echo ========================================
    echo.

    pause

    exit /b 1
)


echo.
echo Global installation successful.
echo.


REM ========================================
REM VERIFY
REM ========================================

echo ========================================
echo       INSTALLATION COMPLETE
echo ========================================
echo.

echo Installation directory:
echo C:\teknolikha

echo.

echo Checking TeknoLikha...

teknolikha --version

echo.

if errorlevel 1 (

    echo WARNING:
    echo The teknolikha command is not available
    echo in this terminal yet.
    echo.

    echo Close this window and open a NEW
    echo Command Prompt or PowerShell window.
    echo.

) else (

    echo ========================================
    echo       TEKNOLIKHA READY!
    echo ========================================
    echo.

    echo Try:

    echo.
    echo   teknolikha --help

    echo.
    echo   teknolikha imageresize --help

    echo.
    echo   teknolikha iccconvert --list-icc

    echo.
    echo   teknolikha iccconvert

    echo.
)


echo.
pause

endlocal
exit /b 0