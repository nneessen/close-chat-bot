#!/usr/bin/env python3
import json
import base64
import sys

def decode_jwt_payload(token):
    """Decode JWT payload without verification"""
    try:
        # Split token into parts
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Decode payload (second part)
        payload = parts[1]
        # Add padding if needed
        payload += '=' * (4 - len(payload) % 4)
        
        # Decode base64
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except:
        return None

if __name__ == "__main__":
    token = "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzU2MzAxNDA2LCJqdGkiOiJiMzE2OTUyNS03MmNmLTQ3NDktYjBlNC03NTE2ODM0N2IxYjQiLCJ1c2VyX3V1aWQiOiJlOGQ1ODk4Zi1iOGQxLTQ4ZDQtOTRmOC01YjU4YjJjZDczOWQifQ.sXZ1cM21-GJEGdYlwK5filbl5ftquTq9dLYjlFFqMMGYN66iH9pu6OVqAU2gxETLRwElH5_L0c2PeMnFtHQkrA"
    
    payload = decode_jwt_payload(token)
    if payload:
        print("🔍 Decoded JWT payload:")
        print(json.dumps(payload, indent=2))
        
        if 'user_uuid' in payload:
            user_uuid = payload['user_uuid']
            print(f"\n📋 Your Calendly URIs should be:")
            print(f"CALENDLY_USER_URI=\"https://api.calendly.com/users/{user_uuid}\"")
            print(f"\nTo get organization URI, you'll need the API call to work.")
    else:
        print("❌ Failed to decode JWT token")