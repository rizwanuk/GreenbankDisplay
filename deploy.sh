#!/bin/bash
set -e
cd /home/opc/display

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building..."
export VITE_MICROSOFT_CLIENT_ID=e7651bd2-051d-4b26-9f82-259ecc469f0c
export VITE_MICROSOFT_TENANT_ID=53ae4ab9-b1ae-49ca-84e0-b349ae49593f
npm run build

echo "Restarting PM2..."
pm2 restart prayer-display

echo "Done!"
