#!/bin/bash

# Start n8n with your custom Video API node loaded from dist/
export N8N_CUSTOM_EXTENSIONS="$(pwd)/dist"

echo "🚀 Starting n8n with custom Video API node..."
echo "📂 Loading nodes from: $(pwd)/dist"
echo ""
echo "Once n8n starts:"
echo "  1. Open http://localhost:5678"
echo "  2. Go to Credentials → Add Credential → Search 'Video API'"
echo "  3. Enter your API key"
echo "  4. Create a workflow and add 'AI Video Cutting' node"
echo ""

n8n start
