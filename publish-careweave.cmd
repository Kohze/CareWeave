@echo off
setlocal

cd /d "%~dp0"

echo Initializing the CareWeave repository...
git init || goto :error

echo Staging the complete project...
git -c "safe.directory=%CD%" add --all || goto :error

git -c "safe.directory=%CD%" diff --cached --quiet
if errorlevel 1 (
  echo Creating the submission-ready commit...
  git -c "safe.directory=%CD%" commit -m "Prepare CareWeave WebMCP submission" || goto :error
) else (
  echo No new changes need to be committed.
)

echo Configuring the main branch and GitHub remote...
git -c "safe.directory=%CD%" branch -M main || goto :error
git -c "safe.directory=%CD%" remote get-url origin >nul 2>&1
if errorlevel 1 (
  git -c "safe.directory=%CD%" remote add origin https://github.com/Kohze/CareWeave.git || goto :error
) else (
  git -c "safe.directory=%CD%" remote set-url origin https://github.com/Kohze/CareWeave.git || goto :error
)

echo Pushing CareWeave to GitHub...
git -c "safe.directory=%CD%" push -u origin main || goto :error

echo.
echo CareWeave was published successfully.
exit /b 0

:error
echo.
echo Publishing stopped because one of the Git commands failed.
echo Resolve the message above, then run this file again.
exit /b 1
