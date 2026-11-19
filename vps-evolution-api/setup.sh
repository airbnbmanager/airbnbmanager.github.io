#!/usr/bin/env bash
# ========================================================
# 🚀 THE UNIQUE HAVEN HOMES — VPS 1-CLICK INSTALLER
# For Evolution API v2 (Zero Per-Message Cost WhatsApp Gateway)
# ========================================================
set -e

echo "📦 [1/4] Updating Ubuntu packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw

echo "🐳 [2/4] Installing Docker & Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    sudo apt-get install -y docker-compose-plugin
fi

echo "🛡️ [3/4] Configuring Firewall (Allowing Port 8080)..."
sudo ufw allow 8080/tcp || true
sudo ufw allow 22/tcp || true

echo "🚀 [4/4] Starting Evolution API Containers..."
docker compose pull
docker compose up -d

echo ""
echo "========================================================"
echo "🎉 Evolution API is now RUNNING on your VPS!"
echo "📡 URL: http://$(curl -s ifconfig.me):8080"
echo "🔑 Global API Key: tuhh_secure_evo_key_2026"
echo "========================================================"
echo "Next step: Open your browser, visit the Manager UI or Swagger at:"
echo "http://$(curl -s ifconfig.me):8080/docs"
echo "Create instance 'the-unique-haven-homes' and scan the QR code with WhatsApp (+91 9194109911)."
echo "========================================================"
