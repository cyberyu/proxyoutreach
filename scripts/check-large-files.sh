#!/bin/bash

# Utility script to check for large files and help with cleanup

echo "🔍 Checking for large files in the repository..."
echo "================================================"

# Find files larger than 20MB
echo "Files larger than 20MB:"
find . -size +20M -type f -not -path "./.git/*" -not -path "./node_modules/*" | while read -r file; do
    size=$(du -h "$file" | cut -f1)
    echo "  📁 $file ($size)"
done

echo ""

# Find files larger than 10MB
echo "Files larger than 10MB:"
find . -size +10M -type f -not -path "./.git/*" -not -path "./node_modules/*" | while read -r file; do
    size=$(du -h "$file" | cut -f1)
    echo "  📄 $file ($size)"
done

echo ""

# Check specific file types that are commonly large
echo "Database and backup files:"
find . \( -name "*.sql" -o -name "*.ibd" -o -name "*.frm" -o -name "*.tar.gz" -o -name "*.zip" \) -not -path "./.git/*" -not -path "./node_modules/*" | while read -r file; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "  💾 $file ($size)"
    fi
done

echo ""

# Show total size of large files
echo "📊 Summary:"
total_size=$(find . -size +10M -type f -not -path "./.git/*" -not -path "./node_modules/*" -exec du -ch {} + 2>/dev/null | tail -1 | cut -f1)
echo "  Total size of files >10MB: $total_size"

# Check git status for staged files
if command -v git >/dev/null 2>&1 && [ -d .git ]; then
    echo ""
    echo "🔄 Git status check:"
    staged_large=$(git diff --cached --name-only | xargs -I {} sh -c 'test -f "{}" && find "{}" -size +20M' 2>/dev/null)
    if [ -n "$staged_large" ]; then
        echo "  ❌ Large files staged for commit:"
        echo "$staged_large" | sed 's/^/    /'
    else
        echo "  ✅ No large files staged for commit"
    fi
fi

echo ""
echo "💡 Recommendations:"
echo "  1. Add large files to .gitignore"
echo "  2. Use 'git rm --cached filename' to remove accidentally staged files"
echo "  3. Consider Git LFS for files that must be tracked"
echo "  4. Set up the pre-commit hook: cp scripts/pre-commit-hook.sh .git/hooks/pre-commit"
