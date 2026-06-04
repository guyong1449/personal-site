@echo off
setlocal
set "PROJECT_ROOT=e:\Mywork\algorithm\personal-site"
cd /d "%PROJECT_ROOT%" || exit /b 0
"C:\Program Files\Git\bin\bash.exe" -lc ".cursor/hooks/auto-git-sync.sh"
exit /b 0
