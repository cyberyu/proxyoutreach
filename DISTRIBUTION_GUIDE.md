# Proxy Outreach - Distribution Guide

This document explains how to distribute and deploy the Proxy Outreach application using the lightweight Docker approach.

## Distribution Strategy

The application is split into two components for efficient distribution:

1. **Lightweight Docker Image** (~2-3GB) - Contains application code and dependencies
2. **SQL Dumps Archive** (~6-8GB compressed) - Contains database data

## Building for Distribution

### 1. Build Lightweight Docker Image
```bash
./build-lightweight.sh
```

### 2. Create SQL Dumps Archive
```bash
./deploy.sh --create-archive
```

This creates `proxy-outreach-dumps.tar.gz` containing all SQL dumps.

## Distribution Methods

### Method 1: File Transfer (Recommended for Internal Use)

**For the distributor:**
```bash
# Create all distribution files
./build-lightweight.sh
./deploy.sh --create-archive

# Save Docker image to file
docker save proxy-outreach-lightweight:latest > proxy-outreach-app.tar

# Files to distribute:
# - proxy-outreach-app.tar (Docker image)
# - proxy-outreach-dumps.tar.gz (SQL dumps)
# - deploy.sh (deployment script)
```

**For the recipient:**
```bash
# Load Docker image
docker load < proxy-outreach-app.tar

# Deploy application
chmod +x deploy.sh
./deploy.sh --full-deploy
```

### Method 2: Docker Registry + Separate Archive

**For the distributor:**
```bash
# Push to Docker registry
docker tag proxy-outreach-lightweight:latest your-registry/proxy-outreach:latest
docker push your-registry/proxy-outreach:latest

# Distribute only the dumps archive
./deploy.sh --create-archive
# Share: proxy-outreach-dumps.tar.gz
```

**For the recipient:**
```bash
# Pull Docker image
docker pull your-registry/proxy-outreach:latest
docker tag your-registry/proxy-outreach:latest proxy-outreach-lightweight:latest

# Deploy with dumps
./deploy.sh --full-deploy
```

### Method 3: Cloud Storage Distribution

**Upload to cloud storage:**
```bash
# Upload Docker image
docker save proxy-outreach-lightweight:latest | gzip > proxy-outreach-app.tar.gz
# Upload to S3/Google Cloud/etc.

# Upload dumps archive
./deploy.sh --create-archive
# Upload proxy-outreach-dumps.tar.gz to cloud
```

**Download and deploy:**
```bash
# Download files
wget https://your-storage/proxy-outreach-app.tar.gz
wget https://your-storage/proxy-outreach-dumps.tar.gz
wget https://your-storage/deploy.sh

# Load and deploy
gunzip proxy-outreach-app.tar.gz
docker load < proxy-outreach-app.tar
chmod +x deploy.sh
./deploy.sh --extract-dumps
./deploy.sh --deploy
```

## Deployment Commands

### Quick Start
```bash
# Complete deployment in one command
./deploy.sh --full-deploy
```

### Step-by-step Deployment
```bash
# 1. Extract SQL dumps
./deploy.sh --extract-dumps

# 2. Deploy application
./deploy.sh --deploy

# 3. Check status
./deploy.sh --status
```

### Management Commands
```bash
# Check deployment status
./deploy.sh --status

# View container logs
docker logs -f proxy-outreach-app

# Clean up everything
./deploy.sh --cleanup
```

## Advantages of This Approach

1. **Smaller Docker Image**: ~2-3GB instead of ~42GB
2. **Faster Builds**: No need to rebuild image for data changes
3. **Flexible Data Management**: Can update dumps without rebuilding
4. **Better Version Control**: Code and data versioned separately
5. **Easier Distribution**: Can use different channels for app vs data

## File Sizes Comparison

| Component | Monolithic Approach | Lightweight Approach |
|-----------|-------------------|-------------------|
| Docker Image | ~42GB | ~2-3GB |
| SQL Dumps | Embedded | ~6-8GB compressed |
| Total Transfer | ~42GB | ~8-11GB |
| Build Time | 40+ minutes | 5-10 minutes |

## Security Considerations

- SQL dumps contain sensitive data - encrypt for transfer
- Use secure channels for distribution
- Consider split delivery (app via registry, data via secure transfer)
- Implement access controls for dump archives

## Troubleshooting

### Container won't start
```bash
docker logs proxy-outreach-app
```

### Dumps not importing
```bash
# Check if dumps are mounted correctly
docker exec proxy-outreach-app ls -la /usr/src/app/data/dumps/

# Check MySQL logs inside container
docker exec proxy-outreach-app tail -f /var/log/mysql/error.log
```

### Out of space
```bash
# Clean up old containers and images
docker system prune -a

# Check dump sizes
du -h ./dumps/
```
