@echo off
title Push TriaQ to GitHub
echo ========================================================
echo   Pushing TriaQ to https://github.com/themahesh007/TriaQ.git
echo ========================================================
echo.
"%LOCALAPPDATA%\Programs\MinGit\cmd\git.exe" push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   SUCCESS! All code is now live on your GitHub repo!
    echo ========================================================
) else (
    echo.
    echo If prompted to sign in, please click "Sign in with your browser".
)
echo.
pause
