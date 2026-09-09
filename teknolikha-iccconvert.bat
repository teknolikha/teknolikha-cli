@echo off
setlocal EnableExtensions

REM ============================================================
REM TeknoLikha - ICC Convert (Right-Click Handler)
REM
REM This script is called by the Windows right-click context
REM menu with the full path of the selected image as %1.
REM
REM It must be located at:
REM   C:\teknolikha\teknolikha-iccconvert.bat
REM (matches where install.bat installs the project)
REM ============================================================

title TeknoLikha - ICC Convert

set "FILE=%~1"

if "%FILE%"=="" (
    echo.
    echo ERROR: No file was passed to this script.
    echo This script is meant to be run from the right-click menu.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   TeknoLikha ICC Convert
echo ========================================
echo.
echo File: %FILE%
echo.

REM ------------------------------------------------------------
REM CHECK TEKNOLIKHA IS AVAILABLE
REM ------------------------------------------------------------

where teknolikha >nul 2>&1

if errorlevel 1 (
    echo ERROR: The 'teknolikha' command was not found.
    echo.
    echo Make sure TeknoLikha CLI is installed globally
    echo ^(run install.bat^), and that you opened a NEW
    echo Explorer / Command Prompt session after installing.
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------
REM ICC PROFILE (optional)
REM ------------------------------------------------------------

set "ICC="

set /p "ICC=ICC profile name (Enter for default 3PASS TARP): "

REM ------------------------------------------------------------
REM QUALITY (optional, default 100)
REM ------------------------------------------------------------

set "QUALITY="

set /p "QUALITY=JPEG quality 0-100 (Enter for 100): "

if "%QUALITY%"=="" set "QUALITY=100"

echo.

REM ------------------------------------------------------------
REM RUN FROM THE FILE'S OWN FOLDER
REM so the "converted" output folder lands next to it
REM ------------------------------------------------------------

pushd "%~dp1"

if "%ICC%"=="" (
    teknolikha iccconvert "%~nx1" -q %QUALITY%
) else (
    teknolikha iccconvert "%~nx1" -i "%ICC%" -q %QUALITY%
)

popd

echo.
echo ========================================
echo Done. Press any key to close this window.
echo ========================================

pause >nul

endlocal
exit /b 0
