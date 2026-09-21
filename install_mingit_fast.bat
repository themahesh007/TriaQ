@echo off
set "DEST=%LOCALAPPDATA%\Programs\MinGit"
set "ZIP=%TEMP%\mingit.zip"

if not exist "%DEST%" mkdir "%DEST%"

echo [1/3] Downloading MinGit via curl...
curl.exe -L -k -o "%ZIP%" "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip"

echo [2/3] Extracting MinGit...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Expand-Archive -Path '%ZIP%' -DestinationPath '%DEST%' -Force"
del "%ZIP%" >nul 2>&1

echo [3/3] Verifying Git installation...
"%DEST%\cmd\git.exe" --version

powershell -NoProfile -Command "$dest = '$env:LOCALAPPDATA\Programs\MinGit\cmd'; $u = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($u -notlike '*MinGit*') { [Environment]::SetEnvironmentVariable('Path', $u + ';' + $dest, 'User') }"

echo MinGit is ready!
