# Docker Deployment with Pre-loaded Database

This Docker setup includes the complete MySQL database pre-loaded, eliminating the need for data import during container startup.

## Quick Start

### Option 1: Run with Pre-loaded Data (Recommended)
```bash
# Build image with pre-loaded database
./copy-mysql-data.sh
docker build -t proxy-outreach:preloaded .

# Run container
docker run -d -p 3000:3000 --name proxy-outreach-app proxy-outreach:preloaded

# Access application
open http://localhost:3000
```

### Option 2: Using Docker Compose
```bash
# Update docker-compose.yml to use preloaded image
docker-compose up -d
```

## Pre-loaded Database Benefits

### ✅ **Ultra-Fast Startup**
- **Before**: 2-5 minutes (database initialization + data import)
- **After**: 10-15 seconds (just MySQL service start)

### ✅ **Complete Data Included**
- All account data (voted/unvoted) 
- Outreach records and synchronization
- Proposal and director information
- User preferences and settings

### ✅ **Production Ready**
- No external dependencies
- Self-contained deployment
- Consistent data state

## How It Works

1. **Data Copy**: `copy-mysql-data.sh` copies the current MySQL data directory (4.8GB)
2. **Image Build**: Dockerfile copies pre-loaded data into `/var/lib/mysql/`
3. **Container Start**: MySQL starts with existing data, no initialization needed

## Database Contents

The pre-loaded database includes:
- **proxy** database with all application tables
- **mysql** system database 
- **performance_schema** for monitoring
- **sys** for MySQL utilities

## Container Management

```bash
# Check container status
docker ps

# View container logs
docker logs proxy-outreach-app

# Stop container
docker stop proxy-outreach-app

# Remove container
docker rm proxy-outreach-app

# Remove image
docker rmi proxy-outreach:preloaded
```

## Data Persistence

⚠️ **Important**: Database changes made inside the container will be lost when the container is removed. For production, consider:

1. **Volume Mounting**:
   ```bash
   docker run -d -p 3000:3000 \
     -v /host/mysql-data:/var/lib/mysql \
     proxy-outreach:preloaded
   ```

2. **Docker Compose with Volumes**:
   ```yaml
   volumes:
     - mysql_data:/var/lib/mysql
   ```

## Updating Pre-loaded Data

To update the pre-loaded data:
```bash
# 1. Update your local database
# 2. Re-copy the data
./copy-mysql-data.sh

# 3. Rebuild the image
docker build -t proxy-outreach:preloaded .
```

## Image Size

- **Base Image**: Ubuntu 22.04 (~100MB)
- **Dependencies**: Node.js + MySQL (~500MB) 
- **Application**: ~50MB
- **Database Data**: ~4.8GB
- **Total**: ~5.5GB

The larger image size is offset by the dramatically faster startup time and deployment simplicity.
