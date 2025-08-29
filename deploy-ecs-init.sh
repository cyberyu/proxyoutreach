#!/bin/bash

# Init container deployment for ECS (no external storage required)
# Uses two containers: one for dumps, one for the application

set -e

echo "🚀 AWS ECS Init Container Deployment (No S3/EFS Required)"
echo "======================================================="

# Configuration
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-123456789012}"
ECR_REPOSITORY_APP="${ECR_REPOSITORY_APP:-proxy-outreach-app}"
ECR_REPOSITORY_DUMPS="${ECR_REPOSITORY_DUMPS:-proxy-outreach-dumps}"

# Derived variables
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
APP_IMAGE_URI="${ECR_URI}/${ECR_REPOSITORY_APP}:latest"
DUMPS_IMAGE_URI="${ECR_URI}/${ECR_REPOSITORY_DUMPS}:latest"

# Function to build and push both images
build_and_push_images() {
    echo "🔨 Building and pushing Docker images..."
    
    # Setup ECR repositories
    for repo in "$ECR_REPOSITORY_APP" "$ECR_REPOSITORY_DUMPS"; do
        if aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" &>/dev/null; then
            echo "✅ ECR repository '$repo' already exists"
        else
            echo "📦 Creating ECR repository '$repo'..."
            aws ecr create-repository --repository-name "$repo" --region "$AWS_REGION"
        fi
    done
    
    # Build dumps container
    echo "🏗️  Building dumps container..."
    docker build -f Dockerfile.dumps -t "$ECR_REPOSITORY_DUMPS:latest" .
    docker tag "$ECR_REPOSITORY_DUMPS:latest" "$DUMPS_IMAGE_URI"
    
    # Build app container (lightweight version)
    echo "🏗️  Building app container..."
    docker build -f Dockerfile.lightweight -t "$ECR_REPOSITORY_APP:latest" .
    docker tag "$ECR_REPOSITORY_APP:latest" "$APP_IMAGE_URI"
    
    # Login to ECR
    echo "🔐 Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_URI"
    
    # Push both images
    echo "📤 Pushing dumps image..."
    docker push "$DUMPS_IMAGE_URI"
    
    echo "📤 Pushing app image..."
    docker push "$APP_IMAGE_URI"
    
    echo "✅ Both images pushed successfully"
}

# Function to generate init container task definition
generate_init_container_task_definition() {
    echo "📋 Generating ECS task definition with init container..."
    
    cat > ecs-task-definition-init.json <<EOF
{
    "family": "proxy-outreach-init",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "2048",
    "memory": "4096",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "volumes": [
        {
            "name": "shared-dumps"
        }
    ],
    "containerDefinitions": [
        {
            "name": "dumps-init",
            "image": "${DUMPS_IMAGE_URI}",
            "essential": false,
            "mountPoints": [
                {
                    "sourceVolume": "shared-dumps",
                    "containerPath": "/shared/dumps"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/proxy-outreach",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "dumps-init"
                }
            }
        },
        {
            "name": "proxy-outreach",
            "image": "${APP_IMAGE_URI}",
            "essential": true,
            "dependsOn": [
                {
                    "containerName": "dumps-init",
                    "condition": "SUCCESS"
                }
            ],
            "mountPoints": [
                {
                    "sourceVolume": "shared-dumps",
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
                    "awslogs-stream-prefix": "app"
                }
            }
        }
    ]
}
EOF
    
    echo "✅ Init container task definition generated: ecs-task-definition-init.json"
}

# Function to show deployment summary
show_init_summary() {
    echo ""
    echo "🎉 Init Container Deployment Summary"
    echo "=================================="
    echo "📦 App Image: $APP_IMAGE_URI"
    echo "📦 Dumps Image: $DUMPS_IMAGE_URI"
    echo "📋 Task Definition: ecs-task-definition-init.json"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Register task definition:"
    echo "   aws ecs register-task-definition --cli-input-json file://ecs-task-definition-init.json"
    echo ""
    echo "2. Run ECS task:"
    echo "   aws ecs run-task --cluster your-cluster --task-definition proxy-outreach-init"
    echo ""
    echo "💡 How it works:"
    echo "   1. Init container starts and copies SQL dumps to shared volume"
    echo "   2. Init container exits successfully"
    echo "   3. Main app container starts and imports dumps from shared volume"
    echo "   4. Web application becomes available"
    echo ""
    echo "✅ Benefits:"
    echo "   - No external storage required (S3/EFS)"
    echo "   - Self-contained deployment"
    echo "   - Works in any ECS environment"
    echo "   - Automatic dependency management"
}

# Main script logic
case "${1:-}" in
    --build-push)
        build_and_push_images
        ;;
    --generate-task-def)
        generate_init_container_task_definition
        ;;
    --full-deploy)
        echo "🚀 Full init container deployment process..."
        build_and_push_images
        generate_init_container_task_definition
        show_init_summary
        ;;
    --help|*)
        echo "AWS ECS Init Container Deployment Script"
        echo ""
        echo "This approach uses two containers:"
        echo "1. Init container with SQL dumps (runs once, then exits)"
        echo "2. Main application container (depends on init container success)"
        echo ""
        echo "Configuration (set as environment variables):"
        echo "  AWS_REGION=$AWS_REGION"
        echo "  AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID"
        echo "  ECR_REPOSITORY_APP=$ECR_REPOSITORY_APP"
        echo "  ECR_REPOSITORY_DUMPS=$ECR_REPOSITORY_DUMPS"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  --build-push      Build and push both Docker images"
        echo "  --generate-task-def Generate ECS task definition"
        echo "  --full-deploy     Complete deployment process"
        echo "  --help            Show this help message"
        echo ""
        echo "Advantages:"
        echo "  ✅ No S3 or EFS required"
        echo "  ✅ Self-contained deployment"
        echo "  ✅ Works in restricted environments"
        echo "  ✅ Automatic dependency management"
        echo ""
        echo "Trade-offs:"
        echo "  📦 Two container images to manage"
        echo "  💾 Dumps stored in container image (larger images)"
        echo "  🔄 Need to rebuild dumps image for data updates"
        ;;
esac
