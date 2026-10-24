@echo off
setlocal
echo ========================================================
echo  Launching Files Manager in Chrome (Tarik Business Profile)
echo ========================================================

set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

set "APP_HTML=%~dp0index.html"

echo Profile: Tarik Business (Profile 3)
echo Loading Files Application...

start "" "%CHROME_PATH%" --profile-directory="Profile 3" "%APP_HTML%"

echo Done! Files is opening in your Chrome Tarik Business window.
exit /b 0
