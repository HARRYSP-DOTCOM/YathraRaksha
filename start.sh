#!/bin/bash

# YathraRaksha Startup Script
# Starts both frontend (static server on port 5500) and backend (FastAPI on port 8000)

# Colors for nice output formatting
GREEN='\033[0;32m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}                Starting YathraRaksha System                    ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Get the script directory and cd to it
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Check if ports are already in use
if command -v lsof &>/dev/null; then
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}[Warning] Port 8000 (Backend) is already in use.${NC}"
    fi
    if lsof -Pi :5500 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}[Warning] Port 5500 (Frontend) is already in use.${NC}"
    fi
fi

# Function to handle shutdown (Ctrl+C / SIGINT / SIGTERM / EXIT)
cleanup() {
    # Remove traps to prevent recursion
    trap - SIGINT SIGTERM EXIT
    
    echo -e "\n${YELLOW}Stopping all services...${NC}"
    
    # Kill backend if running
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${MAGENTA}[Backend]${NC} Stopping process (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null
    fi
    
    # Kill frontend if running
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${GREEN}[Frontend]${NC} Stopping process (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    
    wait 2>/dev/null
    echo -e "${CYAN}All services stopped successfully. Goodbye!${NC}"
    exit 0
}

# Trap signals for graceful exit
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
echo -e "${MAGENTA}[Backend]${NC} Launching FastAPI server..."
if [ -f "backend/.venv/bin/python" ]; then
    # Start using virtualenv python inside a subshell to isolate directory changes
    (cd backend && .venv/bin/python run.py) &
    BACKEND_PID=$!
elif command -v python3 &>/dev/null; then
    # Fallback to system python3 inside a subshell
    echo -e "${YELLOW}[Backend] Warning: Virtualenv python not found. Trying system python3.${NC}"
    (cd backend && python3 run.py) &
    BACKEND_PID=$!
else
    echo -e "${RED}[Backend] Error: Python 3 is not installed or available.${NC}"
    exit 1
fi

echo -e "${MAGENTA}[Backend]${NC} Running with PID $BACKEND_PID"

# Give the backend a moment to spin up
sleep 1.5

# 2. Start Frontend
echo -e "${GREEN}[Frontend]${NC} Launching static HTTP server on port 5500..."
if command -v python3 &>/dev/null; then
    # Explicitly serve the frontend from the script's directory in a subshell
    (cd "$SCRIPT_DIR" && python3 -m http.server 5500) &
    FRONTEND_PID=$!
    echo -e "${GREEN}[Frontend]${NC} Running with PID $FRONTEND_PID"
else
    echo -e "${RED}[Frontend] Error: Python 3 is not available to serve the frontend.${NC}"
    kill "$BACKEND_PID" 2>/dev/null
    exit 1
fi

echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}Both services are running!${NC}"
echo -e " - ${GREEN}Frontend:${NC} http://127.0.0.1:5500"
echo -e " - ${MAGENTA}Backend:${NC}  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)"
echo -e "${YELLOW}Press Ctrl+C to stop both services...${NC}"
echo -e "${CYAN}================================================================${NC}"

# Wait on background jobs
wait
