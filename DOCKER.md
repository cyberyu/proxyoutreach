# Docker Deployment Guide

## Proxy Account Outreach Application

This guide explains how to build and run the Proxy Account Outreach application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

## Quick Start

### Option 1: Using the build script (recommended)
```bash
./build-docker.sh
```

### Option 2: Manual Docker build
```bash
# Build the image
docker build -t proxy-outreach:latest .

# Run the container
docker run -d -p 3000:3000 --name proxy-outreach-app proxy-outreach:latest
```

### Option 3: Using Docker Compose (recommended for development)
```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f
```

## Application Access

Once the container is running, access the application at:
- **URL**: http://localhost:3000
- **Port**: 3000

## Container Features

- **Base Image**: Ubuntu 22.04
- **Node.js Version**: 20.19.4
- **Database**: MySQL 8.0 (included in container)
- **Application Port**: 3000
- **Health Check**: Built-in health monitoring

## Environment Variables

The following environment variables are configured:

- `NODE_ENV=production`
- `MYSQL_ROOT_PASSWORD=rootpass`
- `MYSQL_DATABASE=proxy`
- `MYSQL_USER=webapp`
- `MYSQL_PASSWORD=webapppass`

## Persistent Data

### Using Docker Compose
The docker-compose setup includes a named volume for MySQL data persistence:
- `mysql_data`: Stores MySQL database files
- `./uploads`: Maps local uploads directory to container

### Manual Docker Run
To persist data with manual docker run:
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/uploads:/usr/src/app/uploads \
  -v mysql_data:/var/lib/mysql \
  --name proxy-outreach-app \
  proxy-outreach:latest
```

## Container Management

### View running containers
```bash
docker ps
```

### View application logs
```bash
docker logs proxy-outreach-app
# or
docker logs -f proxy-outreach-app  # follow logs
```

### Stop the container
```bash
docker stop proxy-outreach-app
```

### Remove the container
```bash
docker rm proxy-outreach-app
```

### Remove the image
```bash
docker rmi proxy-outreach:latest
```

## Health Check

The container includes a health check that:
- Runs every 30 seconds
- Checks if the application responds on port 3000
- Has a 40-second startup grace period
- Retries 3 times before marking as unhealthy

Check container health:
```bash
docker inspect --format='{{.State.Health.Status}}' proxy-outreach-app
```

## Troubleshooting

### Container won't start
1. Check if port 3000 is already in use:
   ```bash
   netstat -tulpn | grep :3000
   ```

2. View container logs:
   ```bash
   docker logs proxy-outreach-app
   ```

### Database connection issues
1. Ensure MySQL service is running inside the container
2. Check if the initialization script ran successfully
3. Verify database credentials match the environment variables

### Application not accessible
1. Verify the container is running:
   ```bash
   docker ps
   ```

2. Check port mapping:
   ```bash
   docker port proxy-outreach-app
   ```

3. Test health check:
   ```bash
   curl http://localhost:3000/
   ```

## Development

### Rebuilding after changes
```bash
# Stop and remove existing container
docker stop proxy-outreach-app
docker rm proxy-outreach-app

# Rebuild image
docker build -t proxy-outreach:latest .

# Run new container
docker run -d -p 3000:3000 --name proxy-outreach-app proxy-outreach:latest
```

### Using Docker Compose for development
```bash
# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## Production Deployment

For production deployment, consider:

1. **Environment Variables**: Create a `.env` file for sensitive data
2. **SSL/TLS**: Use a reverse proxy (nginx, traefik) for HTTPS
3. **Monitoring**: Implement logging and monitoring solutions
4. **Backups**: Set up automated database backups
5. **Resource Limits**: Configure memory and CPU limits

### Example production docker-compose with nginx:
```yaml
version: '3.8'
services:
  proxy-outreach-app:
    build: .
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - proxy-outreach-app
```

## Support

If you encounter issues:
1. Check the application logs
2. Verify all required files are present
3. Ensure Docker has sufficient resources
4. Check firewall settings for port 3000
