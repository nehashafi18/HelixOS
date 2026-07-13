#!/bin/bash
# GeneInsight AI — local development startup script

set -e

echo "Starting GeneInsight AI in development mode..."

# Start PostgreSQL via Docker if not running
if ! docker ps | grep -q geneinsight-postgres; then
  echo "Starting PostgreSQL..."
  docker run -d \
    --name geneinsight-postgres \
    -e POSTGRES_DB=geneinsight \
    -e POSTGRES_USER=geneinsight \
    -e POSTGRES_PASSWORD=geneinsight \
    -p 5432:5432 \
    postgres:15
  echo "Waiting for Postgres to be ready..."
  sleep 3
fi

# Start backend
echo "Starting backend..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$(dirname "$0")/frontend"
npm install -q
npm run dev &
FRONTEND_PID=$!

echo ""
echo "GeneInsight AI is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Demo accounts:"
echo "  researcher@demo.com / demo123"
echo "  admin@demo.com / admin123"
echo ""
echo "Press Ctrl+C to stop"

wait $BACKEND_PID $FRONTEND_PID
