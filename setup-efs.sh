#!/bin/bash

# Automated EFS setup script for Proxy Outreach SQL dumps
# This script creates EFS, security groups, and provides upload instructions
# Supports all five proxy databases:
#   - proxy (main application data)
#   - proxy_sds (SDS-specific data)  
#   - proxy_sds_calibrated (SDS calibrated data)
#   - proxy_sel (SEL-specific data)
#   - proxy_sel_calibrated (SEL calibrated data)

set -e

echo "🚀 Automated EFS Setup for Proxy Outreach"
echo "========================================"

# Configuration
AWS_REGION="${AWS_REGION:-us-west-2}"
EFS_NAME="proxy-outreach-dumps"
SG_NAME="proxy-outreach-efs-sg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI v2"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure'"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Create EFS file system
create_efs() {
    print_info "Creating EFS file system..."
    
    # Check if EFS already exists
    EXISTING_EFS=$(aws efs describe-file-systems \
        --query "FileSystems[?Tags[?Key=='Name' && Value=='$EFS_NAME']].FileSystemId" \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_EFS" ] && [ "$EXISTING_EFS" != "None" ]; then
        EFS_ID="$EXISTING_EFS"
        print_status "EFS file system already exists: $EFS_ID"
    else
        EFS_ID=$(aws efs create-file-system \
            --creation-token proxy-outreach-$(date +%s) \
            --performance-mode generalPurpose \
            --throughput-mode provisioned \
            --provisioned-throughput-in-mibps 100 \
            --encrypted \
            --tags Key=Name,Value="$EFS_NAME" \
            --query 'FileSystemId' \
            --output text \
            --region $AWS_REGION)
        
        print_status "EFS file system created: $EFS_ID"
        
        # Wait for EFS to be available
        print_info "Waiting for EFS to be available..."
        aws efs wait file-system-available --file-system-id $EFS_ID --region $AWS_REGION
        print_status "EFS is now available"
    fi
    
    export EFS_ID
}

# Get VPC information
get_vpc_info() {
    print_info "Getting VPC information..."
    
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=is-default,Values=true" \
        --query 'Vpcs[0].VpcId' \
        --output text \
        --region $AWS_REGION)
    
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        print_error "No default VPC found. Please create a VPC first."
        exit 1
    fi
    
    VPC_CIDR=$(aws ec2 describe-vpcs \
        --vpc-ids $VPC_ID \
        --query 'Vpcs[0].CidrBlock' \
        --output text \
        --region $AWS_REGION)
    
    print_status "Using VPC: $VPC_ID ($VPC_CIDR)"
    export VPC_ID VPC_CIDR
}

# Create security group
create_security_group() {
    print_info "Creating security group for EFS..."
    
    # Check if security group already exists
    EXISTING_SG=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $AWS_REGION 2>/dev/null || echo "None")
    
    if [ "$EXISTING_SG" != "None" ] && [ -n "$EXISTING_SG" ]; then
        SG_ID="$EXISTING_SG"
        print_status "Security group already exists: $SG_ID"
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name "$SG_NAME" \
            --description "Security group for Proxy Outreach EFS" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text \
            --region $AWS_REGION)
        
        print_status "Security group created: $SG_ID"
        
        # Add NFS rule
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 2049 \
            --cidr $VPC_CIDR \
            --region $AWS_REGION
        
        print_status "NFS access rule added to security group"
    fi
    
    export SG_ID
}

# Create mount targets
create_mount_targets() {
    print_info "Creating EFS mount targets..."
    
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[*].SubnetId' \
        --output text \
        --region $AWS_REGION)
    
    for SUBNET_ID in $SUBNET_IDS; do
        print_info "Creating mount target for subnet: $SUBNET_ID"
        
        # Check if mount target already exists
        EXISTING_MT=$(aws efs describe-mount-targets \
            --file-system-id $EFS_ID \
            --region $AWS_REGION \
            --query "MountTargets[?SubnetId=='$SUBNET_ID'].MountTargetId" \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$EXISTING_MT" ]; then
            print_status "Mount target already exists for subnet: $SUBNET_ID"
        else
            MOUNT_TARGET_ID=$(aws efs create-mount-target \
                --file-system-id $EFS_ID \
                --subnet-id $SUBNET_ID \
                --security-groups $SG_ID \
                --query 'MountTargetId' \
                --output text \
                --region $AWS_REGION 2>/dev/null)
            
            if [ $? -eq 0 ]; then
                print_status "Mount target created: $MOUNT_TARGET_ID"
            else
                print_warning "Could not create mount target for subnet: $SUBNET_ID (may already exist)"
            fi
        fi
    done
    
    print_info "Waiting for mount targets to be available..."
    sleep 10
    export SUBNET_IDS
}

# Generate upload instructions
generate_upload_instructions() {
    print_info "Generating upload instructions..."
    
    cat > efs-upload-instructions.txt <<EOF
# EFS Upload Instructions for Proxy Outreach SQL Dumps

## Your EFS Details:
- EFS ID: $EFS_ID
- Region: $AWS_REGION
- Security Group: $SG_ID
- VPC: $VPC_ID

## Quick Upload Method (Recommended):

### Step 1: Launch EC2 Instance for Upload
aws ec2 run-instances \\
    --image-id ami-0c02fb55956c7d316 \\
    --instance-type t3.micro \\
    --key-name YOUR-KEY-PAIR-NAME \\
    --subnet-id $(echo $SUBNET_IDS | cut -d' ' -f1) \\
    --security-group-ids $SG_ID \\
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=EFS-Upload-Instance}]' \\
    --region $AWS_REGION

### Step 2: Connect to EC2 and Mount EFS
# SSH to the instance
ssh -i your-key.pem ec2-user@INSTANCE_IP

# Install EFS utils
sudo yum update -y
sudo yum install -y amazon-efs-utils

# Mount EFS
sudo mkdir -p /mnt/efs
sudo mount -t efs $EFS_ID:/ /mnt/efs
sudo mkdir -p /mnt/efs/dumps
sudo chmod 755 /mnt/efs/dumps

### Step 3: Upload Dumps
# From your local machine, create archive
./deploy.sh --create-archive

# Upload to EC2
scp -i your-key.pem proxy-outreach-dumps.tar.gz ec2-user@INSTANCE_IP:~/

# Back on EC2, extract to EFS
tar -xzf proxy-outreach-dumps.tar.gz
sudo cp docker/*.sql /mnt/efs/dumps/
sudo chmod 644 /mnt/efs/dumps/*.sql

# Verify
ls -la /mnt/efs/dumps/

### Step 4: Clean Up
# Terminate the EC2 instance when done
aws ec2 terminate-instances --instance-ids INSTANCE_ID --region $AWS_REGION

## ECS Task Definition Fragment:
{
    "volumes": [
        {
            "name": "dumps-volume",
            "efsVolumeConfiguration": {
                "fileSystemId": "$EFS_ID",
                "rootDirectory": "/dumps"
            }
        }
    ],
    "containerDefinitions": [
        {
            "mountPoints": [
                {
                    "sourceVolume": "dumps-volume",
                    "containerPath": "/usr/src/app/data/dumps"
                }
            ]
        }
    ]
}

EOF

    print_status "Upload instructions saved to: efs-upload-instructions.txt"
}

# Show summary
show_summary() {
    echo ""
    echo "🎉 EFS Setup Complete!"
    echo "====================="
    echo ""
    echo "📝 EFS Details:"
    echo "   File System ID: $EFS_ID"
    echo "   Security Group: $SG_ID"
    echo "   Region: $AWS_REGION"
    echo ""
    echo "📁 Next Steps:"
    echo "   1. Review upload instructions: cat efs-upload-instructions.txt"
    echo "   2. Create dumps archive: ./deploy.sh --create-archive"
    echo "   3. Upload dumps to EFS (see instructions)"
    echo "   4. Deploy ECS with EFS: ./deploy-ecs-efs.sh --generate-task-def"
    echo ""
    echo "💰 Cost Estimate:"
    echo "   EFS Storage (8GB): ~$2.40/month"
    echo "   Provisioned Throughput: ~$61/month"
    echo "   Total: ~$63/month"
    echo ""
    echo "💡 To reduce costs, you can switch to General Purpose throughput mode"
    echo "   after upload is complete (reduces cost to ~$2.40/month total)"
}

# Main execution
main() {
    check_prerequisites
    create_efs
    get_vpc_info
    create_security_group
    create_mount_targets
    generate_upload_instructions
    show_summary
}

# Run main function
main
