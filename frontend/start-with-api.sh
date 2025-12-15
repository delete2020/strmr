#!/bin/bash

# Start the React Native app with the correct API URL
# This script sets the API URL to the host machine's IP address

echo "🚀 Starting strmr React Native App with API configuration..."

# Get the host machine's IP address
HOST_IP=$(hostname -I | awk '{print $1}')

echo "📍 Host machine IP: $HOST_IP"
echo "🔗 Primary API URL: http://$HOST_IP:7777/api"
echo "🔗 Docker bridge API URL: http://172.17.0.1:7777/api"

# Test connectivity first
echo "🔍 Testing API connectivity..."
if curl -s "http://$HOST_IP:7777/health" > /dev/null; then
    echo "✅ Primary API URL is accessible"
    export EXPO_PUBLIC_API_URL="http://$HOST_IP:7777/api"
elif curl -s "http://172.17.0.1:7777/health" > /dev/null; then
    echo "✅ Docker bridge API URL is accessible"
    export EXPO_PUBLIC_API_URL="http://172.17.0.1:7777/api"
else
    echo "⚠️  Neither API URL is accessible, using primary URL"
    export EXPO_PUBLIC_API_URL="http://$HOST_IP:7777/api"
fi

echo "🌐 Starting Expo development server..."
echo "   Make sure your strmr backend is running on port 7777"
echo "   Backend should be accessible at: http://$HOST_IP:7777"

# Start the Expo development server
npm start
