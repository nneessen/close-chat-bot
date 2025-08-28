#!/bin/bash

# Bot Control Script for Close.io SMS Chatbot
# Usage: ./bot-control.sh [enable|disable|status]

if [ -z "$WEBHOOK_ENDPOINT_URL" ]; then
  echo "⚠️  WEBHOOK_ENDPOINT_URL environment variable not set"
  echo "Please set it to your deployed app URL (e.g., https://your-app.railway.app)"
  exit 1
fi

BASE_URL="${WEBHOOK_ENDPOINT_URL}"

case "$1" in
  "enable")
    echo "🤖 Enabling SMS bot..."
    curl -X POST "${BASE_URL}/api/bot/enable" \
      -H "Content-Type: application/json" \
      | python3 -m json.tool
    ;;
  
  "disable") 
    echo "🤖 Disabling SMS bot..."
    curl -X POST "${BASE_URL}/api/bot/disable" \
      -H "Content-Type: application/json" \
      | python3 -m json.tool
    ;;
  
  "status")
    echo "🤖 Checking bot status..."
    curl -s "${BASE_URL}/api/bot/status" \
      | python3 -m json.tool
    ;;
  
  "health")
    echo "🏥 Full system health check..."
    curl -s "${BASE_URL}/api/health" \
      | python3 -m json.tool
    ;;
  
  *)
    echo "🤖 Close.io SMS Bot Control"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  enable   - Enable the SMS bot (will respond to messages)"
    echo "  disable  - Disable the SMS bot (will not respond to messages)" 
    echo "  status   - Check current bot status"
    echo "  health   - Full system health check"
    echo ""
    echo "Examples:"
    echo "  $0 enable"
    echo "  $0 disable"
    echo "  $0 status"
    echo ""
    ;;
esac
