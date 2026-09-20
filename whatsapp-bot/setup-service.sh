#!/usr/bin/env bash
# UHHS WhatsApp Gateway Background Service Installer (macOS launchd)
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$HOME/Library/LaunchAgents/com.uhhs.whatsappbot.plist"

echo "📦 Installing UHHS WhatsApp Bot as 24/7 background service..."

# Unload existing if running
launchctl unload "$TARGET" 2>/dev/null || true

# Copy plist
cp "$DIR/com.uhhs.whatsappbot.plist" "$TARGET"
chmod 644 "$TARGET"

# Load service
launchctl load "$TARGET"

echo "✅ Service registered and started!"
echo "📡 Checking status on http://localhost:3000..."
sleep 2

if curl -s http://localhost:3000/status >/dev/null 2>&1; then
    echo "🎉 WhatsApp Gateway is LIVE on http://localhost:3000!"
else
    echo "ℹ️ Gateway is starting up, check: curl http://localhost:3000/status"
fi
