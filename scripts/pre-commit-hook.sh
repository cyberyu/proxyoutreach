#!/bin/bash

# Pre-commit hook to prevent large files from being committed
# Place this in .git/hooks/pre-commit and make it executable

MAX_SIZE=20971520  # 20MB in bytes
echo "Checking for large files (>20MB)..."

# Check for large files being committed
large_files=$(git diff --cached --name-only | xargs -I {} sh -c 'test -f "{}" && find "{}" -size +20M')

if [ -n "$large_files" ]; then
    echo "❌ ERROR: The following files are larger than 20MB and cannot be committed:"
    echo "$large_files"
    echo ""
    echo "Please:"
    echo "1. Add large files to .gitignore"
    echo "2. Use Git LFS for files that need to be tracked: git lfs track 'filename'"
    echo "3. Remove large files from staging: git reset HEAD filename"
    echo ""
    echo "Current file sizes:"
    echo "$large_files" | xargs ls -lh
    exit 1
fi

# Check for specific problematic files
problematic_files=$(git diff --cached --name-only | grep -E '\.(sql|ibd|frm|tar\.gz|zip)$' | xargs -I {} sh -c 'test -f "{}" && echo "{}"')

if [ -n "$problematic_files" ]; then
    echo "⚠️  WARNING: Found potentially large files that should be in .gitignore:"
    echo "$problematic_files"
    echo ""
    echo "File sizes:"
    echo "$problematic_files" | xargs ls -lh
    echo ""
    echo "Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Commit aborted."
        exit 1
    fi
fi

echo "✅ No large files detected. Proceeding with commit."
