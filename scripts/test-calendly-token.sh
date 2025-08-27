#!/bin/bash

echo "🔍 Testing Calendly API token..."
echo ""

# Use the token from your .env.example (assuming you've added it to your .env)
TOKEN="eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzU2MzAxNDA2LCJqdGkiOiJiMzE2OTUyNS03MmNmLTQ3NDktYjBlNC03NTE2ODM0N2IxYjQiLCJ1c2VyX3V1aWQiOiJlOGQ1ODk4Zi1iOGQxLTQ4ZDQtOTRmOC01YjU4YjJjZDczOWQifQ.sXZ1cM21-GJEGdYlwK5filbl5ftquTq9dLYjlFFqMMGYN66iH9pu6OVqAU2gxETLRwElH5_L0c2PeMnFtHQkrA"

echo "Testing with specific user UUID..."
USER_UUID="e8d5898f-b8d1-48d4-94f8-5b58b2cd739d"

# Test the /users/me endpoint
echo "1. Testing /users/me endpoint:"
curl -s -w "HTTP Status: %{http_code}\n" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://api.calendly.com/users/me

echo ""
echo ""

# Test with specific user UUID
echo "2. Testing with specific user UUID:"
curl -s -w "HTTP Status: %{http_code}\n" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "https://api.calendly.com/users/$USER_UUID"

echo ""
echo ""

# Test organizations endpoint
echo "3. Testing organizations endpoint:"
curl -s -w "HTTP Status: %{http_code}\n" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     https://api.calendly.com/organizations

echo ""