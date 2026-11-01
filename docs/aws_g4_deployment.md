# AWS EC2 G4dn Deployment Guide: Dishviz Isolated 3D Engine

This guide walks through deploying the complete **Dishviz** platform on an **AWS EC2 G4dn instance** equipped with an **NVIDIA T4 GPU**.

The deployment is **100% self-contained and isolated**. It makes zero external 3rd-party API calls (no Tripo, no Meshy, no external cloud tokens). All computer vision silhouette carving, marching cubes polygonization, and photographic PBR texture baking happen directly inside the dedicated Python virtual environment on the instance.

---

## 1. Instance Specification

| Resource | Recommended Setting |
| :--- | :--- |
| **Instance Type** | `g4dn.xlarge` (or `g4dn.2xlarge`) |
| **GPU** | 1x NVIDIA T4 Tensor Core GPU (16 GB VRAM) |
| **vCPU / Memory** | 4 vCPUs / 16 GiB RAM |
| **Operating System** | Ubuntu Server 22.04 LTS or Deep Learning OSS AMI |
| **Storage** | 60+ GB GP3 SSD |

---

## 2. Server Provisioning & NVIDIA Driver Setup

### Step 2.1: Verify NVIDIA Driver and CUDA
Once logged into your EC2 instance via SSH:
```bash
nvidia-smi
```
You should see output indicating the **NVIDIA T4 GPU** and CUDA version (e.g., CUDA 12.x or 11.8).

If the NVIDIA driver is not installed on Ubuntu:
```bash
sudo apt update && sudo apt install -y ubuntu-drivers-common
sudo ubuntu-drivers autoinstall
sudo reboot
```

### Step 2.2: Install System Prerequisites
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm git build-essential
# Ensure Node.js 18+ or 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 3. Clone Repository & Setup Isolated Engine Virtual Environment

### Step 3.1: Clone Repository
```bash
cd /opt
sudo git clone <YOUR_REPO_URL> dishviz
sudo chown -R $USER:$USER /opt/dishviz
cd /opt/dishviz
```

### Step 3.2: Run Automated Engine Setup
The repository includes an automatic setup script (`setup_venv.sh`) that checks for `nvidia-smi`, creates `backend/engine/venv`, and installs PyTorch with CUDA acceleration alongside NumPy, SciPy, Scikit-Image, Trimesh, and Pillow:
```bash
cd backend/engine
chmod +x setup_venv.sh
./setup_venv.sh
```

### Step 3.3: Verify GPU Acceleration in Engine
Test the virtual environment's CUDA link:
```bash
./venv/bin/python -c "import torch; print('CUDA Active:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```
Output must show:
```
CUDA Active: True
Device: NVIDIA T4
```

---

## 4. Backend Platform Configuration

### Step 4.1: Install Node.js Dependencies & Build
```bash
cd /opt/dishviz
npm install
npm run build
```

### Step 4.2: Configure Production Environment Variables
Edit `/opt/dishviz/backend/.env`:
```env
NODE_ENV=production
PORT=3001
FRONTEND_ORIGIN=https://your-domain.com
APP_BASE_URL=https://api.your-domain.com

# 100% Isolated Native Engine (Zero 3rd-party API calls)
AR_PROVIDER=native

# Database
DATABASE_URL="file:./prod.db"

# Internal Master Secret (for internal ingestion)
MASTER_INTERNAL_SECRET="your-high-entropy-master-secret-here"

# Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
```

### Step 4.3: Initialize Database Schema
```bash
cd /opt/dishviz/backend
npx prisma migrate deploy
```

---

## 5. Process Supervision (PM2)

Install PM2 to run both the API backend and frontend with auto-restart on boot:
```bash
sudo npm install -g pm2

# Start Backend API
cd /opt/dishviz/backend
pm2 start dist/index.js --name "dishviz-backend"

# Save PM2 process list and configure systemd startup
pm2 save
pm2 startup
```

---

## 6. Verification & Health Check

Test the engine end-to-end directly on the server:
```bash
cd /opt/dishviz/backend/engine
./venv/bin/python reconstruct.py --help
```

You can now submit multi-angle photos through the Web UI or via the REST API (`POST /api/internal/v1/ar/jobs` or `POST /api/v1/ar/jobs`). The system will:
1. Reconcile camera angles and compute foreground silhouettes.
2. Carve the visual hull voxel grid with CUDA acceleration on the NVIDIA T4.
3. Extract smooth watertight meshes via Marching Cubes.
4. Project photographic textures onto UV coordinates to generate `.glb` and `.usdz`.
5. Return the ready 3D asset in under 4 seconds without any external API calls.
