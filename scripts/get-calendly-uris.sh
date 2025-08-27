#!/bin/bash

echo "🔍 Getting your Calendly API URIs..."
echo ""

# Check if CALENDLY_API_TOKEN is set
if [ -z "$CALENDLY_API_TOKEN" ]; then
    echo "❌ CALENDLY_API_TOKEN not found in environment"
    echo "Please set your Calendly API token first:"
    echo "export CALENDLY_API_TOKEN='your_token_here'"
    exit 1
fi

echo "📡 Fetching your user information..."
USER_RESPONSE=$(curl -s -H "Authorization: Bearer $CALENDLY_API_TOKEN" https://api.calendly.com/users/me)

if [ $? -eq 0 ]; then
    USER_URI=$(echo "$USER_RESPONSE" | grep -o '"uri":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ User URI: $USER_URI"
else
    echo "❌ Failed to fetch user information"
    exit 1
fi

echo ""
echo "📡 Fetching your organization information..."
ORG_RESPONSE=$(curl -s -H "Authorization: Bearer $CALENDLY_API_TOKEN" https://api.calendly.com/organizations)

if [ $? -eq 0 ]; then
    ORG_URI=$(echo "$ORG_RESPONSE" | grep -o '"uri":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✅ Organization URI: $ORG_URI"
else
    echo "❌ Failed to fetch organization information"
    exit 1
fi

echo ""
echo "📝 Update your .env file with these values:"
echo "CALENDLY_USER_URI=\"$USER_URI\""
echo "CALENDLY_ORGANIZATION_URI=\"$ORG_URI\""
echo ""