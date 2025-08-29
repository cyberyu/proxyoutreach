#!/bin/bash

# AWS ECS deployment script for proxy outreach application
# Handles ECR push and S3 uploads

set -e

echo "🚀 AWS ECS Deployment Script for Proxy Outreach"
echo "==============================================="

# Configuration - Update these values for your AWS environment
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-123456789012}"  # Replace with your account ID
ECR_REPOSITORY="${ECR_REPOSITORY:-proxy-outreach}"
S3_BUCKET="${S3_BUCKET:-your-bucket-name}"        # Replace with your S3 bucket
S3_PREFIX="${S3_PREFIX:-proxy-outreach/dumps/}"

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

# Function to create ECR repository if it doesn't exist
setup_ecr() {
    echo "🏗️  Setting up ECR repository..."
    
    # Check if repository exists
    if aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" &>/dev/null; then
        echo "✅ ECR repository '$ECR_REPOSITORY' already exists"
    else
        echo "📦 Creating ECR repository '$ECR_REPOSITORY'..."
        aws ecr create-repository \
            --repository-name "$ECR_REPOSITORY" \
            --region "$AWS_REGION"
        echo "✅ ECR repository created"
    fi
}

# Function to build and push Docker image
build_and_push_image() {
    echo "🔨 Building and pushing Docker image..."
    
    # Build ECS-optimized image
    echo "🏗️  Building ECS-optimized image..."
    docker build -f Dockerfile.ecs -t "$ECR_REPOSITORY:latest" .
    
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

# Function to upload SQL dumps to S3
upload_dumps_to_s3() {
    echo "📤 Uploading SQL dumps to S3..."
    
    # Check if dumps exist
    if [ ! -d "docker" ] || [ ! -f "docker/proxy_complete_dump.sql" ]; then
        echo "❌ SQL dump files not found in docker/ directory"
        echo "💡 Run './generate_optimized_dumps.sh' first"
        exit 1
    fi
    
    # Create dumps archive
    echo "📦 Creating dumps archive..."
    ./deploy.sh --create-archive
    
    # Upload archive to S3
    echo "📤 Uploading dumps archive to S3..."
    aws s3 cp proxy-outreach-dumps.tar.gz "s3://${S3_BUCKET}/${S3_PREFIX}proxy-outreach-dumps.tar.gz"
    
    # Also upload individual files for flexibility
    echo "📤 Uploading individual dump files..."
    aws s3 sync docker/ "s3://${S3_BUCKET}/${S3_PREFIX}" --include "*.sql"
    
    echo "✅ SQL dumps uploaded to S3"
    echo "   Archive: s3://${S3_BUCKET}/${S3_PREFIX}proxy-outreach-dumps.tar.gz"
    echo "   Individual files: s3://${S3_BUCKET}/${S3_PREFIX}*.sql"
}

# Function to generate ECS task definition
generate_task_definition() {
    echo "📋 Generating ECS task definition..."
    
    cat > ecs-task-definition.json <<EOF
{
    "family": "proxy-outreach",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "2048",
    "memory": "4096",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/proxy-outreach-task-role",
    "containerDefinitions": [
        {
            "name": "proxy-outreach",
            "image": "${FULL_IMAGE_URI}",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "AWS_DEFAULT_REGION",
                    "value": "${AWS_REGION}"
                },
                {
                    "name": "S3_BUCKET",
                    "value": "${S3_BUCKET}"
                },
                {
                    "name": "S3_DUMPS_PREFIX",
                    "value": "${S3_PREFIX}"
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
    
    echo "✅ Task definition generated: ecs-task-definition.json"
}

# Function to create CloudWatch log group
setup_cloudwatch() {
    echo "📊 Setting up CloudWatch log group..."
    
    if aws logs describe-log-groups --log-group-name-prefix "/ecs/proxy-outreach" --region "$AWS_REGION" | grep -q "/ecs/proxy-outreach"; then
        echo "✅ CloudWatch log group already exists"
    else
        echo "📝 Creating CloudWatch log group..."
        aws logs create-log-group --log-group-name "/ecs/proxy-outreach" --region "$AWS_REGION"
        echo "✅ CloudWatch log group created"
    fi
}

# Function to show deployment summary
show_summary() {
    echo ""
    echo "🎉 ECS Deployment Summary"
    echo "========================"
    echo "📦 Docker Image: $FULL_IMAGE_URI"
    echo "🗄️  SQL Dumps: s3://${S3_BUCKET}/${S3_PREFIX}"
    echo "📋 Task Definition: ecs-task-definition.json"
    echo "📊 CloudWatch Logs: /ecs/proxy-outreach"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Create IAM roles if they don't exist:"
    echo "   - ecsTaskExecutionRole (for ECS to pull image and write logs)"
    echo "   - proxy-outreach-task-role (for S3 access)"
    echo ""
    echo "2. Register task definition:"
    echo "   aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json"
    echo ""
    echo "3. Create ECS service or run task:"
    echo "   aws ecs run-task --cluster your-cluster --task-definition proxy-outreach"
    echo ""
    echo "💡 Remember to:"
    echo "   - Configure security groups to allow port 3000"
    echo "   - Set up Application Load Balancer if needed"
    echo "   - Ensure IAM roles have proper S3 permissions"
}

# Main script logic
case "${1:-}" in
    --check)
        check_prerequisites
        ;;
    --setup-ecr)
        check_prerequisites
        setup_ecr
        ;;
    --build-push)
        check_prerequisites
        setup_ecr
        build_and_push_image
        ;;
    --upload-dumps)
        check_prerequisites
        upload_dumps_to_s3
        ;;
    --generate-task-def)
        generate_task_definition
        ;;
    --setup-logs)
        setup_cloudwatch
        ;;
    --full-deploy)
        echo "🚀 Full ECS deployment process..."
        check_prerequisites
        setup_ecr
        build_and_push_image
        upload_dumps_to_s3
        setup_cloudwatch
        generate_task_definition
        show_summary
        ;;
    --help|*)
        echo "AWS ECS Deployment Script for Proxy Outreach"
        echo ""
        echo "Configuration (set as environment variables):"
        echo "  AWS_REGION=$AWS_REGION"
        echo "  AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
        echo "  ECR_REPOSITORY=$ECR_REPOSITORY"
        echo "  S3_BUCKET=$S3_BUCKET"
        echo "  S3_PREFIX=$S3_PREFIX"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  --check           Check prerequisites"
        echo "  --setup-ecr       Create ECR repository"
        echo "  --build-push      Build and push Docker image"
        echo "  --upload-dumps    Upload SQL dumps to S3"
        echo "  --generate-task-def Generate ECS task definition"
        echo "  --setup-logs      Create CloudWatch log group"
        echo "  --full-deploy     Complete deployment process"
        echo "  --help            Show this help message"
        echo ""
        echo "Quick start:"
        echo "1. Set environment variables for your AWS account"
        echo "2. Run: $0 --full-deploy"
        ;;
esac
