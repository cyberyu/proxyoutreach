#!/bin/bash

# ECS deployment script using EFS for SQL dumps (no S3 required)
# Perfect for restricted AWS environments

set -e

echo "🚀 AWS ECS Deployment with EFS (No S3 Required)"
echo "=============================================="

# Configuration - Update these values for your AWS environment
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-123456789012}"
ECR_REPOSITORY="${ECR_REPOSITORY:-proxy-outreach}"
EFS_NAME="${EFS_NAME:-proxy-outreach-dumps}"

# Derived variables
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE_URI="${ECR_URI}/${ECR_REPOSITORY}:latest"

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "❌ AWS CLI not found. Please install AWS CLI v2"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Please install Docker"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "❌ AWS credentials not configured. Run 'aws configure'"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
}

# Function to create EFS file system
setup_efs() {
    echo "🗄️  Setting up EFS file system..."
    
    # Check if EFS already exists
    EFS_ID=$(aws efs describe-file-systems --query "FileSystems[?Tags[?Key=='Name' && Value=='$EFS_NAME']].FileSystemId" --output text --region "$AWS_REGION" 2>/dev/null || echo "")
    
    if [ -n "$EFS_ID" ] && [ "$EFS_ID" != "None" ]; then
        echo "✅ EFS file system already exists: $EFS_ID"
    else
        echo "📁 Creating EFS file system..."
        EFS_ID=$(aws efs create-file-system \
            --tags Key=Name,Value="$EFS_NAME" \
            --performance-mode generalPurpose \
            --throughput-mode provisioned \
            --provisioned-throughput-in-mibps 100 \
            --query 'FileSystemId' \
            --output text \
            --region "$AWS_REGION")
        
        echo "✅ EFS file system created: $EFS_ID"
        
        # Wait for file system to be available
        echo "⏳ Waiting for EFS to be available..."
        aws efs wait file-system-available --file-system-id "$EFS_ID" --region "$AWS_REGION"
    fi
    
    export EFS_ID
    echo "📝 EFS ID: $EFS_ID"
}

# Function to create EFS mount targets (requires VPC info)
setup_efs_mount_targets() {
    echo "🔗 Setting up EFS mount targets..."
    echo "⚠️  Note: You'll need to create mount targets manually or provide VPC details"
    echo "   EFS ID: $EFS_ID"
    echo ""
    echo "Manual setup commands:"
    echo "   # Get your default VPC subnets"
    echo "   aws ec2 describe-subnets --query 'Subnets[?DefaultForAz==\`true\`].[SubnetId,AvailabilityZone]' --output table"
    echo ""
    echo "   # Create mount target for each subnet"
    echo "   aws efs create-mount-target --file-system-id $EFS_ID --subnet-id subnet-xxxxx --security-groups sg-xxxxx"
}

# Function to build and push Docker image (EFS version)
build_and_push_image() {
    echo "🔨 Building and pushing Docker image (EFS version)..."
    
    # Create EFS-specific Dockerfile
    cat > Dockerfile.efs <<EOF
# EFS-optimized Dockerfile for proxy outreach application
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Environment variables for MySQL
ENV MYSQL_ROOT_PASSWORD=root_password_2024
ENV MYSQL_USER=webapp
ENV MYSQL_PASSWORD=webapp_password_2024

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    gnupg \\
    lsb-release \\
    ca-certificates \\
    apt-transport-https \\
    software-properties-common \\
    python3 \\
    python3-pip \\
    mysql-server \\
    mysql-client \\
    supervisor \\
    jq \\
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \\
    && apt-get install -y nodejs

# Set working directory
WORKDIR /usr/src/app

# Copy Python requirements and install
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install -r /tmp/requirements.txt

# Copy package.json and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy application code (excluding SQL dumps)
COPY . .

# Create necessary directories
RUN mkdir -p /usr/src/app/data/sql \\
    && mkdir -p /usr/src/app/data/parquet \\
    && mkdir -p /usr/src/app/data/excel \\
    && mkdir -p /usr/src/app/data/dumps \\
    && mkdir -p /var/run/mysqld \\
    && mkdir -p /var/log/mysql

# Configure MySQL
RUN chown -R mysql:mysql /var/lib/mysql /var/run/mysqld /var/log/mysql

# Copy the EFS-optimized startup script
COPY docker/start-efs.sh /usr/local/bin/start-efs.sh
RUN chmod +x /usr/local/bin/start-efs.sh

# Expose port
EXPOSE 3000

# Use the EFS startup script
CMD ["/usr/local/bin/start-efs.sh"]
EOF

    # Setup ECR repository
    if aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" &>/dev/null; then
        echo "✅ ECR repository '$ECR_REPOSITORY' already exists"
    else
        echo "📦 Creating ECR repository '$ECR_REPOSITORY'..."
        aws ecr create-repository --repository-name "$ECR_REPOSITORY" --region "$AWS_REGION"
    fi
    
    # Build EFS-optimized image
    echo "🏗️  Building EFS-optimized image..."
    docker build -f Dockerfile.efs -t "$ECR_REPOSITORY:latest" .
    
    # Tag for ECR
    docker tag "$ECR_REPOSITORY:latest" "$FULL_IMAGE_URI"
    
    # Login to ECR
    echo "🔐 Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_URI"
    
    # Push to ECR
    echo "📤 Pushing image to ECR..."
    docker push "$FULL_IMAGE_URI"
    
    echo "✅ Image pushed successfully to $FULL_IMAGE_URI"
}

# Function to upload dumps to EFS (requires EC2 instance or local mount)
upload_dumps_to_efs() {
    echo "📤 Uploading SQL dumps to EFS..."
    echo "⚠️  Note: This requires mounting EFS locally or using an EC2 instance"
    echo ""
    echo "Option 1: Local mount (if EFS mount helper is installed):"
    echo "   sudo mkdir -p /mnt/efs"
    echo "   sudo mount -t efs $EFS_ID:/ /mnt/efs"
    echo "   sudo mkdir -p /mnt/efs/dumps"
    echo "   sudo cp docker/*.sql /mnt/efs/dumps/"
    echo ""
    echo "Option 2: Use EC2 instance to upload:"
    echo "   1. Launch small EC2 instance in same VPC"
    echo "   2. Mount EFS on EC2 instance"
    echo "   3. SCP dumps to EC2 and copy to EFS"
    echo "   4. Terminate EC2 instance"
    echo ""
    echo "Option 3: Use compressed archive:"
    echo "   ./deploy.sh --create-archive"
    echo "   # Upload proxy-outreach-dumps.tar.gz to EC2, then extract to EFS"
}

# Function to generate ECS task definition for EFS
generate_efs_task_definition() {
    echo "📋 Generating ECS task definition with EFS..."
    
    cat > ecs-task-definition-efs.json <<EOF
{
    "family": "proxy-outreach-efs",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "2048",
    "memory": "4096",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "volumes": [
        {
            "name": "dumps-volume",
            "efsVolumeConfiguration": {
                "fileSystemId": "${EFS_ID}",
                "rootDirectory": "/dumps"
            }
        }
    ],
    "containerDefinitions": [
        {
            "name": "proxy-outreach",
            "image": "${FULL_IMAGE_URI}",
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
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/proxy-outreach",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "essential": true
        }
    ]
}
EOF
    
    echo "✅ EFS task definition generated: ecs-task-definition-efs.json"
}

# Function to show deployment summary
show_efs_summary() {
    echo ""
    echo "🎉 EFS-Based ECS Deployment Summary"
    echo "=================================="
    echo "📦 Docker Image: $FULL_IMAGE_URI"
    echo "🗄️  EFS File System: $EFS_ID"
    echo "📋 Task Definition: ecs-task-definition-efs.json"
    echo "📊 CloudWatch Logs: /ecs/proxy-outreach"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Set up EFS mount targets in your VPC subnets"
    echo "2. Upload SQL dumps to EFS (see upload instructions above)"
    echo "3. Register task definition:"
    echo "   aws ecs register-task-definition --cli-input-json file://ecs-task-definition-efs.json"
    echo ""
    echo "4. Run ECS task:"
    echo "   aws ecs run-task --cluster your-cluster --task-definition proxy-outreach-efs"
    echo ""
    echo "💡 Benefits of EFS approach:"
    echo "   - No S3 permissions required"
    echo "   - Persistent storage across container restarts"
    echo "   - Multiple containers can share the same dumps"
    echo "   - Faster access than downloading from S3"
}

# Main script logic
case "${1:-}" in
    --check)
        check_prerequisites
        ;;
    --setup-efs)
        check_prerequisites
        setup_efs
        setup_efs_mount_targets
        ;;
    --build-push)
        check_prerequisites
        build_and_push_image
        ;;
    --upload-dumps)
        upload_dumps_to_efs
        ;;
    --generate-task-def)
        if [ -z "$EFS_ID" ]; then
            echo "❌ EFS_ID not set. Run --setup-efs first or set EFS_ID environment variable"
            exit 1
        fi
        generate_efs_task_definition
        ;;
    --full-deploy)
        echo "🚀 Full EFS-based deployment process..."
        check_prerequisites
        setup_efs
        build_and_push_image
        generate_efs_task_definition
        show_efs_summary
        ;;
    --help|*)
        echo "AWS ECS Deployment Script with EFS (No S3 Required)"
        echo ""
        echo "Configuration (set as environment variables):"
        echo "  AWS_REGION=$AWS_REGION"
        echo "  AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
        echo "  ECR_REPOSITORY=$ECR_REPOSITORY"
        echo "  EFS_NAME=$EFS_NAME"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  --check           Check prerequisites"
        echo "  --setup-efs       Create EFS file system"
        echo "  --build-push      Build and push Docker image"
        echo "  --upload-dumps    Show instructions for uploading dumps to EFS"
        echo "  --generate-task-def Generate ECS task definition with EFS"
        echo "  --full-deploy     Complete deployment process"
        echo "  --help            Show this help message"
        echo ""
        echo "Quick start:"
        echo "1. Set environment variables for your AWS account"
        echo "2. Run: $0 --full-deploy"
        echo "3. Follow instructions to upload dumps to EFS"
        ;;
esac
