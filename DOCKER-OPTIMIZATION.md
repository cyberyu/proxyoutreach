# Docker Image Size Optimization

## Problem
The original Docker image was **over 20GB** due to including:
- 4.8GB MySQL data directory
- 2.0GB SQL backup file  
- 1.6GB+ CSV data files
- 2.7GB compressed archives
- 4.8GB backups directory

## Solution

### Optimized Production Image (~200MB)
Use `Dockerfile.production` which:
- Uses Node.js Alpine (lighter base image)
- Excludes large data files via `.dockerignore`
- Installs only production dependencies
- Separates database into external MySQL container

### Build Commands

```bash
# Build optimized image
./build-optimized-docker.sh

# Or manually:
docker build -f Dockerfile.production -t proxy-outreach:optimized .

# Run with external MySQL
docker-compose -f docker-compose.production.yml up -d
```

### Size Comparison
- **Original**: 20+ GB (with embedded MySQL data)
- **Optimized**: ~200MB (application only)
- **Total Stack**: ~1GB (app + MySQL container + data volume)

### Trade-offs
- **Pro**: 100x smaller image, faster builds/deployments
- **Con**: Requires separate database setup/initialization
- **Pro**: More production-ready architecture
- **Pro**: Database can be backed up/restored independently

## Deployment Options

### 1. Development (with pre-loaded data)
```bash
# Use original Dockerfile for development
docker build -t proxy-outreach:dev .
```

### 2. Production (optimized)
```bash
# Use production Dockerfile  
docker-compose -f docker-compose.production.yml up -d
```
