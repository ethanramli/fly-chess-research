@echo off
pushd "%~dp0" || exit /b 1
"%USERPROFILE%\.venv-class\Scripts\python.exe" "%~dp0python actions\curriculum.py" %*
set "fly_exit=%errorlevel%"
popd
exit /b %fly_exit%
