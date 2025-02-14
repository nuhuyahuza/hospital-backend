#!/bin/bash
set -e

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your configuration values."
  exit 1
fi

# Build and start containers
echo "Building and starting Docker containers..."
docker-compose down -v # Clean up any existing containers
docker-compose build --no-cache # Ensure fresh build
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
until docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for database..."
  sleep 2
done

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy

# Run database seeds
echo "Running database seeds..."
docker-compose exec -T app npx prisma db seed

# Get API_URL from .env or use default
API_URL=$(grep API_URL .env | cut -d '=' -f2 || echo "http://localhost:${PORT:-3003}")

echo "Setup complete! The application is running at ${API_URL}"
echo "You can view the API documentation at ${API_URL}/api-docs" 