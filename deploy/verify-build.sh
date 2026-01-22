#!/bin/bash

# Script to verify that the build contains all required CSS classes
# Usage: ./deploy/verify-build.sh

set -e

echo "🔍 Verifying build..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Run 'npm run build:prod' first."
    exit 1
fi

# Find CSS file
CSS_FILE=$(find dist/assets -name "*.css" | head -1)

if [ -z "$CSS_FILE" ]; then
    echo "❌ Error: No CSS file found in dist/assets"
    exit 1
fi

echo "📄 CSS file: $CSS_FILE"
echo "📦 CSS size: $(du -h "$CSS_FILE" | cut -f1)"

# Check for critical QuickEventModal classes
REQUIRED_CLASSES=(
    "max-w-3xl"
    "rounded-3xl"
    "backdrop-blur-sm"
    "shadow-2xl"
    "bg-white"
    "flex-col"
    "overflow-hidden"
    "px-8"
    "py-6"
)

echo ""
echo "✅ Checking for required CSS classes..."

MISSING_CLASSES=()

for class in "${REQUIRED_CLASSES[@]}"; do
    if grep -q "$class" "$CSS_FILE"; then
        echo "  ✓ $class"
    else
        echo "  ✗ $class (MISSING)"
        MISSING_CLASSES+=("$class")
    fi
done

if [ ${#MISSING_CLASSES[@]} -eq 0 ]; then
    echo ""
    echo "✅ All required classes found in CSS!"
    echo "✅ Build is ready for deployment"
    exit 0
else
    echo ""
    echo "❌ Missing ${#MISSING_CLASSES[@]} classes: ${MISSING_CLASSES[*]}"
    echo "❌ Build may have issues. Try rebuilding with 'npm run build:prod'"
    exit 1
fi
