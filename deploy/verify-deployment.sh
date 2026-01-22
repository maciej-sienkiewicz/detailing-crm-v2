#!/bin/bash

# Script to verify deployment and CSS loading issues

echo "=== Deployment Verification Script ==="
echo ""

echo "1. Checking if index.html exists in build..."
if [ -f "dist/index.html" ]; then
    echo "✓ index.html found"
    CSS_FILE=$(grep -o 'href="/assets/[^"]*\.css"' dist/index.html | sed 's/href="//;s/"//')
    echo "   Referenced CSS: $CSS_FILE"
else
    echo "✗ index.html NOT found - build may have failed"
    exit 1
fi

echo ""
echo "2. Checking if CSS file exists..."
if [ -f "dist$CSS_FILE" ]; then
    echo "✓ CSS file found: dist$CSS_FILE"
    CSS_SIZE=$(wc -c < "dist$CSS_FILE")
    echo "   Size: $CSS_SIZE bytes"
else
    echo "✗ CSS file NOT found"
    exit 1
fi

echo ""
echo "3. Checking for Tailwind classes in CSS..."
if grep -q "max-w-3xl\|rounded-3xl\|backdrop-blur" "dist$CSS_FILE"; then
    echo "✓ Tailwind classes found in CSS"
else
    echo "✗ Tailwind classes NOT found - CSS may not be built correctly"
    exit 1
fi

echo ""
echo "4. Docker deployment commands:"
echo "   # Build the image:"
echo "   docker build -f deploy/Dockerfile -t automotive-crm ."
echo ""
echo "   # Stop and remove old container:"
echo "   docker stop automotive-crm && docker rm automotive-crm"
echo ""
echo "   # Run new container:"
echo "   docker run -d -p 80:80 --name automotive-crm automotive-crm"
echo ""
echo "   # Force browser cache refresh:"
echo "   Press Ctrl+Shift+R in browser"

echo ""
echo "=== Verification Complete ==="
