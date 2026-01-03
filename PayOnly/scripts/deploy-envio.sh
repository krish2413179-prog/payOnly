#!/bin/bash

# FlexPass Envio Indexer Deployment Script

echo "🚀 Deploying FlexPass Envio Indexer..."

# Check if envio CLI is installed
if ! command -v envio &> /dev/null; then
    echo "❌ Envio CLI not found. Installing..."
    npm install -g @envio-dev/envio
fi

# Initialize Envio project if not already done
if [ ! -f "envio.config.yaml" ]; then
    echo "❌ envio.config.yaml not found!"
    exit 1
fi

# Validate configuration
echo "📋 Validating Envio configuration..."
envio config validate

if [ $? -ne 0 ]; then
    echo "❌ Configuration validation failed!"
    exit 1
fi

# Generate TypeScript types
echo "🔧 Generating TypeScript types..."
envio codegen

# Build the indexer
echo "🏗️ Building indexer..."
envio build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Start local development server
echo "🌐 Starting local indexer..."
envio dev &

# Wait for indexer to start
sleep 10

# Check if indexer is running
if curl -f http://localhost:8080/graphql > /dev/null 2>&1; then
    echo "✅ Envio indexer is running at http://localhost:8080"
    echo "📊 GraphQL Playground: http://localhost:8080/graphql"
    echo "🔍 Health check: http://localhost:8080/health"
else
    echo "❌ Failed to start indexer"
    exit 1
fi

echo "🎉 Envio indexer deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update NEXT_PUBLIC_ENVIO_GRAPHQL_URL in .env to http://localhost:8080/graphql"
echo "2. Test GraphQL queries in the playground"
echo "3. Monitor indexing progress in the logs"
echo ""
echo "🔧 Useful commands:"
echo "  envio logs    - View indexer logs"
echo "  envio stop    - Stop the indexer"
echo "  envio restart - Restart the indexer"