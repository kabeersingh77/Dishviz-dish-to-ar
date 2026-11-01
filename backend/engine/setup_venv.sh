#!/usr/bin/env bash
set -e

echo "========================================================"
echo " Byte-Mod-AR: AWS GPU / Linux Virtual Environment Setup "
echo "========================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment in ./venv ..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip, setuptools, wheel..."
pip install --upgrade pip setuptools wheel

# Check for NVIDIA GPU
if command -v nvidia-smi &> /dev/null; then
    echo "[GPU DETECTED] Installing PyTorch with CUDA acceleration..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
else
    echo "[CPU MODE] Installing standard PyTorch..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
fi

echo "Installing 3D geometry and image processing dependencies..."
pip install -r requirements.txt

echo ""
echo "========================================================"
echo " Setup complete! Ready for standalone GPU 3D reconstruction."
echo "========================================================"
