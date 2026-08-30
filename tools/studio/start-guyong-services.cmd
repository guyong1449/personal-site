@echo off
setlocal
set "ACTION=%~1"
if not defined ACTION set "ACTION=start"
set "REPO_ROOT=%~dp0..\.."
set "SCRIPT=%REPO_ROOT%\tools\studio\windows-service.ps1"
if exist "%SCRIPT%" goto repo_ready
set "REPO_ROOT=E:\Mywork\algorithm\personal-site"
set "SCRIPT=%REPO_ROOT%\tools\studio\windows-service.ps1"

:repo_ready
if not exist "%SCRIPT%" (
  echo Cannot find GUYONG service controller: %SCRIPT%
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Action "%ACTION%" -RepoRoot "%REPO_ROOT%"
if errorlevel 1 (
  echo GUYONG service operation failed. Check .local-content\runtime\*.log.
  exit /b 1
)

if /I "%ACTION%"=="start" (
  start "" "http://127.0.0.1:4317"
  start "" "http://127.0.0.1:4319/studio"
)
if /I "%ACTION%"=="restart" (
  start "" "http://127.0.0.1:4317"
  start "" "http://127.0.0.1:4319/studio"
)
endlocal
