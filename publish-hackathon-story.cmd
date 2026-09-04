@echo off
setlocal EnableExtensions

cd /d "%~dp0"
if errorlevel 1 goto :fail

where git >nul 2>&1
if errorlevel 1 (
  echo Git was not found on PATH.
  goto :fail
)

git -c "safe.directory=%CD%" rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo This folder is not a Git repository.
  goto :fail
)

set "CURRENT_BRANCH="
for /f "delims=" %%B in ('git -c "safe.directory=%CD%" branch --show-current') do set "CURRENT_BRANCH=%%B"
if /i not "%CURRENT_BRANCH%"=="main" (
  echo This command must be run while the main branch is checked out. Current branch: %CURRENT_BRANCH%
  goto :fail
)

if /i "%~1"=="--check" (
  echo Validation passed. The repository is on main.
  exit /b 0
)

echo Staging only the CareWeave README and submission story...
git -c "safe.directory=%CD%" add -- README.md docs/SUBMISSION.md docs/SUBMISSION_COPY.md docs/DEVPOST_STORY.md publish-hackathon-story.cmd
if errorlevel 1 goto :fail

echo Checking the staged Markdown and command file...
git -c "safe.directory=%CD%" diff --cached --check -- README.md docs/SUBMISSION.md docs/SUBMISSION_COPY.md docs/DEVPOST_STORY.md publish-hackathon-story.cmd
if errorlevel 1 goto :fail

git -c "safe.directory=%CD%" diff --cached --quiet -- README.md docs/SUBMISSION.md docs/SUBMISSION_COPY.md docs/DEVPOST_STORY.md publish-hackathon-story.cmd
if errorlevel 1 goto :commit

echo No new README or submission-story changes need to be committed.
goto :push

:commit
echo Creating the hackathon story commit...
git -c "safe.directory=%CD%" commit -m "Polish CareWeave hackathon story" -- README.md docs/SUBMISSION.md docs/SUBMISSION_COPY.md docs/DEVPOST_STORY.md publish-hackathon-story.cmd
if errorlevel 1 goto :fail

:push
echo Pushing CareWeave main to GitHub...
git -c "safe.directory=%CD%" push origin main
if errorlevel 1 goto :fail

echo.
echo CareWeave hackathon copy was published successfully.
echo Unrelated artifact changes were not included.
exit /b 0

:fail
echo.
echo Publishing stopped. Review the Git message above, then run this file again.
exit /b 1
