@echo off
setlocal

echo.
echo ========================================
echo  TeknoLikha Context Menu Installer
echo ========================================
echo.

set "CMD=%APPDATA%\npm\teknolikha.cmd"

if not exist "%CMD%" (
    echo ERROR: TeknoLikha CLI was not found.
    echo.
    echo Expected:
    echo %CMD%
    echo.
    echo Make sure TeknoLikha is installed globally.
    pause
    exit /b 1
)

echo TeknoLikha found:
echo %CMD%
echo.

reg add "HKCU\Software\Classes\SystemFileAssociations\image\shell\TeknoLikha" /ve /d "TeknoLikha" /f >nul

reg add "HKCU\Software\Classes\SystemFileAssociations\image\shell\TeknoLikha\shell\ConvertICC" /ve /d "Convert to 3PASS TARP ICC" /f >nul

reg add "HKCU\Software\Classes\SystemFileAssociations\image\shell\TeknoLikha\shell\ConvertICC\command" /ve /d "\"%CMD%\" iccconvert -o \"%%USERPROFILE%%\Desktop\%%date:~4,2%%\%%date:~7,2%%\" \"%%1\"" /f >nul

echo.
echo ========================================
echo  Context menu installed successfully!
echo ========================================
echo.
echo Right-click an image to test it.
echo.

pause