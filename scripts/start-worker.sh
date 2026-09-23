#!/bin/bash

# ============================================
# Start Worker Process
# AutoLeads Fix 1-7 Integration
# ============================================

set -e

echo "🚀 Starting AutoLeads Worker Process..."
echo "========================================"

# Go to backend directory
cd "$(dirname "$0")/../backend"

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing packages..."
  npm install
fi

echo "✅ Starting worker..."
echo "Worker ID: worker-$(date +%s)"
echo "Listening for jobs on Redis queue: 'search:queue'"
echo "========================================"
echo ""

# Start worker with logging
node worker.js
