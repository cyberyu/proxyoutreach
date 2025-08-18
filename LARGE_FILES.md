# Large File Management

This document outlines how large files are managed in this repository to prevent Git bloat and ensure smooth collaboration.

## 🚫 **What Files Are Excluded**

The following types of files are automatically excluded from Git:

### Database Files
- `*.sql` - Database dumps (can be multi-GB)
- `*.ibd` - MySQL data files 
- `*.frm` - MySQL table structure files
- `binlog.*` - MySQL binary logs
- `*.db`, `*.sqlite` - Database files

### Archive Files
- `*.tar.gz`, `*.zip`, `*.rar` - Compressed archives
- Docker data directories: `docker/mysql-data/`

### Data Files
- `*.csv`, `*.xlsx`, `*.xls` - Large datasets
- `uploads/` - User uploaded files

### Build and Cache
- `node_modules/` - Dependencies
- `dist/`, `build/` - Build outputs
- `.cache/`, `.parcel-cache/` - Cache directories

## 🛡️ **Protection Mechanisms**

### 1. Enhanced .gitignore
Comprehensive exclusion patterns prevent large files from being tracked.

### 2. Pre-commit Hook
Automatically installed hook prevents commits >20MB:
```bash
# The hook is automatically active after running:
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
```

### 3. Git LFS Configuration
`.gitattributes` configures Git LFS for large file types that need tracking.

### 4. Monitoring Script
Check for large files anytime:
```bash
./scripts/check-large-files.sh
```

## 📋 **Current Large Files Status**

**Total large files (>10MB): 9.2GB**

Major files excluded from Git:
- `docker/proxy_backup.sql` (2.0GB) - Database backup
- `docker/mysql-data/` (4.8GB) - MySQL data directory  
- `proxy-outreach.tar.gz` (2.7GB) - Project archive

## 🚀 **Best Practices**

### For Developers

1. **Check before committing:**
   ```bash
   ./scripts/check-large-files.sh
   ```

2. **If you accidentally stage a large file:**
   ```bash
   git reset HEAD filename
   git rm --cached filename  # if already committed
   ```

3. **For files that must be tracked:**
   ```bash
   git lfs track "*.sql"
   git add .gitattributes
   ```

### For Database Management

1. **Database backups** should be created outside the repository
2. **Use the Docker SQL dump approach** for containerization
3. **Never commit raw MySQL data directories**

### For Data Files

1. **Use sample data** (small subset) in the repository
2. **Document data sources** in README
3. **Provide scripts** to download/generate full datasets

## 🔧 **Troubleshooting**

### "Large file detected" error
If you get a pre-commit error:
1. Check file size: `ls -lh filename`
2. Add to `.gitignore` if it should be excluded
3. Use Git LFS if it needs tracking
4. Remove from staging: `git reset HEAD filename`

### Repository size issues
If the repository becomes large:
1. Run: `git count-objects -vH`
2. Check for large objects: `git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | grep '^blob' | sort -nr`
3. Consider using `git filter-branch` to remove large files from history

### Setting up Git LFS
```bash
# Install Git LFS
git lfs install

# Track specific file types
git lfs track "*.sql"
git lfs track "*.csv"

# Commit the .gitattributes file
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

## 📊 **Monitoring**

Regular monitoring helps maintain repository health:

```bash
# Check repository size
du -sh .git

# Check for large files
./scripts/check-large-files.sh

# List LFS files
git lfs ls-files

# Check Git status for staged large files
git diff --cached --name-only | xargs ls -lh
```

## 📝 **File Size Limits**

| File Type | Limit | Action |
|-----------|-------|---------|
| Code files | No limit | Track normally |
| Documentation | <5MB | Track normally |
| Data samples | <10MB | Track normally |
| Database dumps | >20MB | Use .gitignore |
| Archives | >20MB | Use .gitignore |
| Media files | >20MB | Use Git LFS or exclude |

## 🎯 **Goals**

- Keep repository clone time under 30 seconds
- Maintain repository size under 100MB (excluding LFS)
- Ensure fast Git operations for all team members
- Prevent accidental commits of large files
