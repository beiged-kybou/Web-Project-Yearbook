@echo off
if "%~1"=="" goto usage
if /i "%~1"=="arian" goto arian
if /i "%~1"=="hasan" goto hasan
if /i "%~1"=="ishmam" goto ishmam
:usage
echo Usage: %0 {arian^|hasan^|ishmam}
exit /b 1
:arian
git config --local user.name "Mubtasim Sajid Ahmed"
git config --local user.email "mubtasimsajidahmedarian.11@gmail.com"
goto done
:hasan
git config --local user.name "Mahmudul Hasan"
git config --local user.email "mahmudulsakib3159@gmail.com"
goto done
:ishmam
git config --local user.name "Ishmam Tahmid"
git config --local user.email "tahmid12955@gmail.com"
goto done
:done
echo Switched git identity to:
git config --local user.name
git config --local user.email
