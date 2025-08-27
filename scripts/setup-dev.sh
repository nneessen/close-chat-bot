#!/bin/bash

# Development Setup Script for Close.io SMS Chatbot

set -e

echo "🚀 Setting up Close.io SMS Chatbot development environment..."

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Node.js and npm are installed"

# Check for Docker
if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
    echo "✅ Docker found - will use Docker for databases"
    USE_DOCKER=true
else
    echo "⚠️  Docker not found - please install PostgreSQL and Redis manually"
    USE_DOCKER=false
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Set up environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.local.example .env
    echo "⚠️  Please edit .env file with your actual API keys and configurations"
else
    echo "✅ .env file already exists"
fi

# Start databases with Docker if available
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Starting databases with Docker..."
    docker-compose up -d postgres redis
    
    echo "⏳ Waiting for databases to be ready..."
    sleep 10
    
    # Check if databases are ready
    if docker-compose exec -T postgres pg_isready -U chatbot_user -d close_chatbot >/dev/null 2>&1; then
        echo "✅ PostgreSQL is ready"
    else
        echo "❌ PostgreSQL failed to start"
        exit 1
    fi
    
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis is ready"
    else
        echo "❌ Redis failed to start"
        exit 1
    fi
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
if [ "$USE_DOCKER" = true ]; then
    echo "🗄️  Running database migrations..."
    npx prisma migrate dev --name init
    echo "✅ Database migrations completed"
else
    echo "⚠️  Please set up PostgreSQL and run 'npx prisma migrate dev' manually"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start the development server: npm run dev"
echo "3. Visit http://localhost:3000"
echo ""

if [ "$USE_DOCKER" = true ]; then
    echo "Database URLs:"
    echo "PostgreSQL: postgresql://chatbot_user:chatbot_password@localhost:5432/close_chatbot"
    echo "Redis: redis://localhost:6379"
    echo ""
    echo "To stop databases: docker-compose down"
    echo "To view database logs: docker-compose logs postgres redis"
fi

echo "For troubleshooting, see README.md"