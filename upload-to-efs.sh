#!/bin/bash

# Automated script to upload SQL dumps to EFS using a temporary EC2 instance
# This script handles the entire upload process automatically

set -e

echo "🚀 Automated EFS Upload for Proxy Outreach SQL Dumps"
echo "=================================================="

# Configuration
AWS_REGION="${AWS_REGION:-us-west-2}"
KEY_NAME="${KEY_NAME}"  # Must be set by user
EFS_ID="${EFS_ID}"      # Must be set by user
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.micro}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if [ -z "$EFS_ID" ]; then
        print_error "EFS_ID environment variable not set"
        echo "Run: export EFS_ID=fs-xxxxxxxxx"
        exit 1
    fi
    
    if [ -z "$KEY_NAME" ]; then
        print_error "KEY_NAME environment variable not set"
        echo "Run: export KEY_NAME=your-key-pair-name"
        exit 1
    fi
    
    if [ ! -f "${KEY_NAME}.pem" ] && [ ! -f "~/.ssh/${KEY_NAME}.pem" ]; then
        print_warning "Key file not found in current directory or ~/.ssh/"
        echo "Make sure ${KEY_NAME}.pem is accessible"
    fi
    
    # Check if dumps exist
    if [ ! -d "docker" ] || [ ! -f "docker/proxy_complete_dump.sql" ]; then
        print_error "SQL dump files not found"
        echo "Run: ./generate_optimized_dumps.sh"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Get EFS and VPC information
get_efs_info() {
    print_info "Getting EFS information..."
    
    # Get EFS security group
    EFS_SG=$(aws efs describe-mount-targets \
        --file-system-id $EFS_ID \
        --region $AWS_REGION \
        --query 'MountTargets[0].SecurityGroupId' \
        --output text)
    
    # Get subnet from mount target
    EFS_SUBNET=$(aws efs describe-mount-targets \
        --file-system-id $EFS_ID \
        --region $AWS_REGION \
        --query 'MountTargets[0].SubnetId' \
        --output text)
    
    print_status "EFS Security Group: $EFS_SG"
    print_status "Using Subnet: $EFS_SUBNET"
    
    export EFS_SG EFS_SUBNET
}

# Get latest Amazon Linux AMI
get_ami_id() {
    print_info "Getting latest Amazon Linux AMI..."
    
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text \
        --region $AWS_REGION)
    
    print_status "Using AMI: $AMI_ID"
    export AMI_ID
}

# Launch EC2 instance
launch_ec2() {
    print_info "Launching EC2 instance for upload..."
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --subnet-id $EFS_SUBNET \
        --security-group-ids $EFS_SG \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=EFS-Upload-Temp}]' \
        --user-data '#!/bin/bash
yum update -y
yum install -y amazon-efs-utils
mkdir -p /mnt/efs' \
        --query 'Instances[0].InstanceId' \
        --output text \
        --region $AWS_REGION)
    
    print_status "EC2 instance launched: $INSTANCE_ID"
    
    # Wait for instance to be running
    print_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION
    
    # Get public IP
    INSTANCE_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region $AWS_REGION)
    
    print_status "Instance ready: $INSTANCE_IP"
    
    export INSTANCE_ID INSTANCE_IP
}

# Prepare dumps archive
prepare_dumps() {
    print_info "Preparing SQL dumps archive..."
    
    if [ ! -f "proxy-outreach-dumps.tar.gz" ]; then
        print_info "Creating dumps archive..."
        ./deploy.sh --create-archive
    fi
    
    ARCHIVE_SIZE=$(du -h proxy-outreach-dumps.tar.gz | cut -f1)
    print_status "Archive ready: proxy-outreach-dumps.tar.gz ($ARCHIVE_SIZE)"
}

# Upload and extract dumps
upload_dumps() {
    print_info "Uploading dumps to EC2 instance..."
    
    # Find key file
    KEY_FILE=""
    if [ -f "${KEY_NAME}.pem" ]; then
        KEY_FILE="${KEY_NAME}.pem"
    elif [ -f "~/.ssh/${KEY_NAME}.pem" ]; then
        KEY_FILE="~/.ssh/${KEY_NAME}.pem"
    else
        print_error "Key file not found. Please specify the full path to your .pem file"
        exit 1
    fi
    
    # Wait a bit more for SSH to be ready
    print_info "Waiting for SSH to be ready..."
    sleep 30
    
    # Upload archive
    print_info "Uploading archive to EC2..."
    scp -i $KEY_FILE -o StrictHostKeyChecking=no proxy-outreach-dumps.tar.gz ec2-user@$INSTANCE_IP:~/
    
    # Mount EFS and extract
    print_info "Mounting EFS and extracting dumps..."
    ssh -i $KEY_FILE -o StrictHostKeyChecking=no ec2-user@$INSTANCE_IP << EOF
        # Mount EFS
        sudo mount -t efs $EFS_ID:/ /mnt/efs
        
        # Create dumps directory
        sudo mkdir -p /mnt/efs/dumps
        sudo chmod 755 /mnt/efs/dumps
        
        # Extract and copy dumps
        tar -xzf proxy-outreach-dumps.tar.gz
        sudo cp docker/*.sql /mnt/efs/dumps/
        sudo chmod 644 /mnt/efs/dumps/*.sql
        
        # Verify upload
        echo "Files uploaded to EFS:"
        ls -la /mnt/efs/dumps/
        echo ""
        echo "Total size:"
        du -sh /mnt/efs/dumps/
EOF
    
    print_status "Dumps uploaded successfully to EFS"
}

# Clean up EC2 instance
cleanup_ec2() {
    print_info "Cleaning up EC2 instance..."
    
    aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION > /dev/null
    print_status "EC2 instance terminated: $INSTANCE_ID"
}

# Show summary
show_summary() {
    echo ""
    echo "🎉 EFS Upload Complete!"
    echo "======================"
    echo ""
    echo "📝 Summary:"
    echo "   EFS ID: $EFS_ID"
    echo "   Files uploaded: 5 SQL dump files"
    echo "   Location: /dumps/ in EFS"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Update your ECS task definition to mount EFS"
    echo "   2. Use EFS ID in your task definition: $EFS_ID"
    echo "   3. Deploy with: ./deploy-ecs-efs.sh --generate-task-def"
    echo ""
    echo "💡 ECS Task Definition Fragment:"
    cat << EOF
{
    "volumes": [
        {
            "name": "dumps-volume",
            "efsVolumeConfiguration": {
                "fileSystemId": "$EFS_ID",
                "rootDirectory": "/dumps"
            }
        }
    ]
}
EOF
}

# Error handling
cleanup_on_error() {
    if [ -n "$INSTANCE_ID" ]; then
        print_warning "Cleaning up due to error..."
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION > /dev/null 2>&1 || true
    fi
}

trap cleanup_on_error ERR

# Main execution
main() {
    check_prerequisites
    get_efs_info
    get_ami_id
    prepare_dumps
    launch_ec2
    upload_dumps
    cleanup_ec2
    show_summary
}

# Show usage if no EFS_ID or KEY_NAME
if [ -z "$EFS_ID" ] || [ -z "$KEY_NAME" ]; then
    echo "EFS Upload Script for Proxy Outreach"
    echo ""
    echo "Usage:"
    echo "   export EFS_ID=fs-xxxxxxxxx"
    echo "   export KEY_NAME=your-key-pair-name"
    echo "   export AWS_REGION=us-west-2  # optional"
    echo "   ./upload-to-efs.sh"
    echo ""
    echo "Prerequisites:"
    echo "   - EFS file system created (run ./setup-efs.sh first)"
    echo "   - EC2 key pair for SSH access"
    echo "   - SQL dumps generated (./generate_optimized_dumps.sh)"
    echo ""
    echo "What this script does:"
    echo "   1. Launches temporary EC2 instance"
    echo "   2. Uploads compressed SQL dumps"
    echo "   3. Mounts EFS and extracts dumps"
    echo "   4. Cleans up EC2 instance"
    exit 1
fi

# Run main function
main
