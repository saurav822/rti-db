#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd backend && npm install && cd ..

echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "Setting up Python venv for autofill..."
cd backend/python/autofill
python3 -m venv rti-automation
source rti-automation/bin/activate
pip install -r requirements.txt
playwright install chromium
deactivate
cd ../../..

echo ""
echo "Done! Run 'npm run dev' to start both servers."
