#!/bin/bash

echo "🔍 Debugging Calendly API connection..."
echo ""

# Check if CALENDLY_API_TOKEN is set
if [ -z "$CALENDLY_API_TOKEN" ]; then
    echo "❌ CALENDLY_API_TOKEN not found in environment"
    exit 1
fi

echo "🔑 Token found (showing first 50 chars): ${CALENDLY_API_TOKEN:0:50}..."
echo ""

echo "📡 Testing Calendly API connection..."
echo "Making request to: https://api.calendly.com/users/me"
echo ""

# Make the API call with verbose output
RESPONSE=$(curl -v -H "Authorization: Bearer $CALENDLY_API_TOKEN" \
               -H "Content-Type: application/json" \
               https://api.calendly.com/users/me 2>&1)

echo "Full response:"
echo "$RESPONSE"
echo ""

# Check if the response contains error information
if echo "$RESPONSE" | grep -q "HTTP/"; then
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP/" | tail -1)
    echo "HTTP Status: $HTTP_STATUS"
fi

if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ API returned an error"
else
    echo "✅ API call successful"
    # Try to extract URIs if successful
    if echo "$RESPONSE" | grep -q '"uri"'; then
        echo ""
        echo "📋 Extracting URIs..."
        USER_URI=$(echo "$RESPONSE" | grep -o '"uri":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "User URI: $USER_URI"
    fi
fi