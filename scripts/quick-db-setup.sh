#!/bin/bash

echo "🗄️  Quick Database Setup for Close.io SMS Chatbot"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.local.example .env
fi

echo "Choose your database setup:"
echo "1) Local PostgreSQL with Docker (Recommended for development)"
echo "2) I'll set up a cloud database manually"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "🐳 Setting up local PostgreSQL with Docker..."
        
        # Check if docker-compose exists
        if [ ! -f docker-compose.yml ]; then
            echo "❌ docker-compose.yml not found. Please run this from the project root."
            exit 1
        fi
        
        # Start PostgreSQL
        docker-compose up -d postgres
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 10
        
        # Update .env with local database URL
        if grep -q "DATABASE_URL=" .env; then
            sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://chatbot_user:chatbot_password@localhost:5432/close_chatbot"|' .env
        else
            echo 'DATABASE_URL="postgresql://chatbot_user:chatbot_password@localhost:5432/close_chatbot"' >> .env
        fi
        
        # Generate Prisma client and run migrations
        echo "🔧 Setting up database schema..."
        npx prisma generate
        npx prisma migrate dev --name init
        
        echo "✅ Local PostgreSQL setup complete!"
        echo "   Database URL: postgresql://chatbot_user:chatbot_password@localhost:5432/close_chatbot"
        ;;
    2)
        echo "📋 Manual database setup chosen."
        echo ""
        echo "🌐 Recommended cloud providers:"
        echo "   • Railway: https://railway.app (Easy, free tier)"
        echo "   • Vercel Postgres: https://vercel.com/dashboard"
        echo "   • Supabase: https://supabase.com (PostgreSQL + admin panel)"
        echo ""
        echo "After creating your database:"
        echo "1. Copy the connection string"
        echo "2. Update DATABASE_URL in your .env file"
        echo "3. Run: npx prisma migrate dev --name init"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📚 Next steps:"
echo "1. Get your API keys using: cat scripts/setup-apis.md"
echo "2. Update your .env file with the API keys"
echo "3. Start development: npm run dev"
echo ""
echo "Need help? Check README.md for troubleshooting."