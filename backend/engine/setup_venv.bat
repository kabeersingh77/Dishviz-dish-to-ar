@echo off
echo ========================================================
echo  Byte-Mod-AR: Creating Local Python Virtual Environment
echo ========================================================

cd /d "%~dp0"

if not exist "venv" (
    echo Creating virtual environment in .\venv ...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment. Ensure Python 3.10+ is installed.
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Upgrading pip and wheel...
python -m pip install --upgrade pip setuptools wheel

echo Installing 3D reconstruction dependencies...
python -m pip install -r requirements.txt

echo.
echo ========================================================
echo  Virtual Environment Setup Complete!
echo  To test engine: python reconstruct.py --help
echo ========================================================
