# AWS ECS Deployment Guide for Proxy Outreach

This guide explains how to deploy the Proxy Outreach application on AWS ECS with SQL dumps stored separately from the Docker image.

## AWS ECS Distribution Strategies

### Strategy 1: ECS + S3 (Recommended)

**Architecture:**
- **Docker Image**: Push to Amazon ECR (Elastic Container Registry)
- **SQL Dumps**: Store in Amazon S3
- **ECS Task**: Downloads dumps from S3 at startup

**Benefits:**
- Separate versioning of code vs data
- Fast container startup from ECR
- S3 provides durability and access control
- Cost-effective storage for large files

### Strategy 2: ECS + EFS (Elastic File System)

**Architecture:**
- **Docker Image**: Push to Amazon ECR
- **SQL Dumps**: Store in Amazon EFS
- **ECS Task**: Mounts EFS volume with pre-loaded dumps

**Benefits:**
- Persistent shared storage
- Multiple containers can access same dumps
- Good for frequently updated datasets

### Strategy 3: ECS + Data Volume Containers

**Architecture:**
- **Docker Image**: Push to Amazon ECR
- **SQL Dumps**: Separate data-only container image
- **ECS Task**: Uses volumes-from to share data

## Implementation Examples

### Strategy 1: ECS + S3 Implementation

#### 1. Push Docker Image to ECR
```bash
# Build lightweight image
./build-lightweight.sh

# Tag for ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com
docker tag proxy-outreach-lightweight:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/proxy-outreach:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/proxy-outreach:latest
```

#### 2. Upload SQL Dumps to S3
```bash
# Create dumps archive
./deploy.sh --create-archive

# Upload to S3
aws s3 cp proxy-outreach-dumps.tar.gz s3://your-bucket/proxy-outreach/dumps/proxy-outreach-dumps.tar.gz

# Or upload individual files
aws s3 sync docker/ s3://your-bucket/proxy-outreach/dumps/ --include "*.sql"
```

#### 3. ECS Task Definition
```json
{
    "family": "proxy-outreach",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "2048",
    "memory": "4096",
    "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::123456789012:role/proxy-outreach-task-role",
    "containerDefinitions": [
        {
            "name": "proxy-outreach",
            "image": "123456789012.dkr.ecr.us-west-2.amazonaws.com/proxy-outreach:latest",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "AWS_DEFAULT_REGION",
                    "value": "us-west-2"
                },
                {
                    "name": "S3_BUCKET",
                    "value": "your-bucket"
                },
                {
                    "name": "S3_DUMPS_PREFIX",
                    "value": "proxy-outreach/dumps/"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/proxy-outreach",
                    "awslogs-region": "us-west-2",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
```

### Strategy 2: ECS + EFS Implementation

#### 1. Create EFS File System
```bash
# Create EFS
aws efs create-file-system --tags Key=Name,Value=proxy-outreach-dumps

# Mount target (replace subnet and security group)
aws efs create-mount-target \
    --file-system-id fs-12345678 \
    --subnet-id subnet-12345678 \
    --security-groups sg-12345678
```

#### 2. Upload Dumps to EFS
```bash
# Mount EFS locally
sudo mount -t efs fs-12345678:/ /mnt/efs

# Copy dumps
sudo mkdir -p /mnt/efs/dumps
sudo cp docker/*.sql /mnt/efs/dumps/
```

#### 3. ECS Task Definition with EFS
```json
{
    "family": "proxy-outreach-efs",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "2048",
    "memory": "4096",
    "volumes": [
        {
            "name": "dumps-volume",
            "efsVolumeConfiguration": {
                "fileSystemId": "fs-12345678",
                "rootDirectory": "/dumps"
            }
        }
    ],
    "containerDefinitions": [
        {
            "name": "proxy-outreach",
            "image": "123456789012.dkr.ecr.us-west-2.amazonaws.com/proxy-outreach:latest",
            "mountPoints": [
                {
                    "sourceVolume": "dumps-volume",
                    "containerPath": "/usr/src/app/data/dumps"
                }
            ],
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ]
        }
    ]
}
```

## Quick Start Guide

### Prerequisites
```bash
# 1. Configure AWS CLI
aws configure

# 2. Set environment variables
export AWS_ACCOUNT_ID="123456789012"  # Your AWS account ID
export AWS_REGION="us-west-2"         # Your preferred region
export S3_BUCKET="your-bucket-name"   # Your S3 bucket for dumps
```

### One-Command Deployment
```bash
# Make script executable
chmod +x deploy-ecs.sh

# Deploy everything to ECS
./deploy-ecs.sh --full-deploy
```

## Detailed Implementation

### Required IAM Roles

#### 1. ECS Task Execution Role
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

Attach policies:
- `AmazonECSTaskExecutionRolePolicy`

#### 2. Proxy Outreach Task Role (for S3 access)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### Cost Comparison

| Approach | Storage Cost | Transfer Cost | Scalability |
|----------|-------------|---------------|-------------|
| **Monolithic (42GB image)** | High ECR storage | Very high transfer | Poor |
| **ECS + S3 (Recommended)** | Low ECR + S3 storage | Low transfer | Excellent |
| **ECS + EFS** | Medium EFS storage | No transfer | Good |

### ECS Service Configuration

```bash
# Create ECS service with Application Load Balancer
aws ecs create-service \
    --cluster your-cluster \
    --service-name proxy-outreach \
    --task-definition proxy-outreach:1 \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678],securityGroups=[sg-12345678],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/proxy-outreach-tg/1234567890123456,containerName=proxy-outreach,containerPort=3000"
```

## Production Considerations

### Security Best Practices
1. **S3 Bucket Encryption**: Enable S3 server-side encryption
2. **VPC Configuration**: Run ECS tasks in private subnets
3. **Secrets Management**: Use AWS Secrets Manager for database passwords
4. **IAM Least Privilege**: Minimize S3 permissions

### Performance Optimization
1. **Multi-AZ Deployment**: Deploy across multiple availability zones
2. **Auto Scaling**: Configure ECS service auto scaling
3. **CloudFront**: Use CDN for static assets
4. **RDS**: Consider migrating to Amazon RDS for production

### Monitoring and Logging
1. **CloudWatch Metrics**: Monitor CPU, memory, and custom metrics
2. **Application Logs**: Centralized logging via CloudWatch
3. **X-Ray Tracing**: Distributed tracing for performance insights
4. **Health Checks**: Configure ALB health checks

### Deployment Strategies

#### Blue-Green Deployment
```bash
# Deploy new version
aws ecs update-service \
    --cluster your-cluster \
    --service proxy-outreach \
    --task-definition proxy-outreach:2 \
    --deployment-configuration "minimumHealthyPercent=50,maximumPercent=200"
```

#### Rolling Updates with Data Versioning
```bash
# Update dumps to S3 with versioning
aws s3 cp proxy-outreach-dumps-v2.tar.gz s3://your-bucket/proxy-outreach/dumps/v2/

# Update task definition with new S3 prefix
# Deploy updated task definition
```

## Troubleshooting

### Common Issues

1. **Container fails to start**
   ```bash
   # Check CloudWatch logs
   aws logs get-log-events --log-group-name "/ecs/proxy-outreach"
   ```

2. **S3 download fails**
   ```bash
   # Check IAM permissions
   aws iam simulate-principal-policy \
       --policy-source-arn arn:aws:iam::123456789012:role/proxy-outreach-task-role \
       --action-names s3:GetObject \
       --resource-arns arn:aws:s3:::your-bucket/*
   ```

3. **High startup time**
   - Consider using EFS for faster access
   - Pre-warm containers with Application Auto Scaling
   - Optimize SQL dump size

### Monitoring Startup Time
```bash
# Check container startup metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name CPUUtilization \
    --dimensions Name=ServiceName,Value=proxy-outreach \
    --start-time 2025-08-27T00:00:00Z \
    --end-time 2025-08-27T23:59:59Z \
    --period 300 \
    --statistics Average
```

## Advantages for ECS

✅ **Fully Managed**: No server management  
✅ **Auto Scaling**: Scales based on demand  
✅ **Load Balancing**: Built-in ALB integration  
✅ **Cost Effective**: Pay only for resources used  
✅ **Security**: VPC isolation and IAM integration  
✅ **Monitoring**: CloudWatch integration  
✅ **Deployment**: Rolling updates and blue-green deployments  

## Migration Path

1. **Phase 1**: Deploy lightweight container with S3 dumps
2. **Phase 2**: Migrate to RDS for production database
3. **Phase 3**: Implement caching layer (Redis/ElastiCache)
4. **Phase 4**: Add auto-scaling and multi-region deployment
