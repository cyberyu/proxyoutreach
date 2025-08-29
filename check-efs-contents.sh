#!/bin/bash
set -e

# EFS Content Checker Script
# This script launches a temporary EC2 instance, mounts your EFS filesystem,
# and provides a comprehensive view of what's stored there.

echo "🔍 EFS Content Checker for fs-07c9b65956846dd51"
echo "=================================================="

# Configuration from your EFS setup
export AWS_REGION="us-east-1"
export EFS_ID="fs-07c9b65956846dd51"
export VPC_ID="vpc-0413a65a733c586b4"
export SUBNET_ID="subnet-048b863399f44469a"  # us-east-1a
export SG_ID="sg-0801976936653c8c1"          # BR-AWS-Service security group

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS CLI not configured or no credentials found"
    echo "💡 Run 'aws configure' to set up your credentials"
    exit 1
fi

echo "✅ AWS CLI configured"
echo "🔧 Configuration:"
echo "   Region: $AWS_REGION"
echo "   EFS ID: $EFS_ID"
echo "   VPC ID: $VPC_ID"
echo "   Subnet: $SUBNET_ID"
echo "   Security Group: $SG_ID"
echo ""

# Function to clean up on exit
cleanup() {
    if [ ! -z "$INSTANCE_ID" ]; then
        echo ""
        echo "🧹 Cleaning up resources..."
        echo "🔄 Terminating EC2 instance: $INSTANCE_ID"
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION --output text
        echo "✅ Cleanup complete"
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Check if EFS exists and get details
echo "🔍 Checking EFS filesystem status..."
EFS_STATE=$(aws efs describe-file-systems \
    --file-system-id $EFS_ID \
    --query 'FileSystems[0].LifeCycleState' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "NOT_FOUND")

if [ "$EFS_STATE" = "NOT_FOUND" ]; then
    echo "❌ EFS filesystem $EFS_ID not found or access denied"
    exit 1
elif [ "$EFS_STATE" != "available" ]; then
    echo "⚠️ EFS filesystem is in state: $EFS_STATE (not available)"
    echo "💡 Wait for EFS to be in 'available' state before checking contents"
    exit 1
fi

echo "✅ EFS filesystem is available"

# Get EFS details
echo "📊 EFS Details:"
aws efs describe-file-systems \
    --file-system-id $EFS_ID \
    --query 'FileSystems[0].{Name:Name,Size:SizeInBytes.Value,CreationTime:CreationTime,PerformanceMode:PerformanceMode,ThroughputMode:ThroughputMode}' \
    --output table \
    --region $AWS_REGION

# Check mount targets
echo ""
echo "📡 Mount Targets:"
aws efs describe-mount-targets \
    --file-system-id $EFS_ID \
    --query 'MountTargets[*].{MountTargetId:MountTargetId,SubnetId:SubnetId,AvailabilityZone:AvailabilityZone,LifeCycleState:LifeCycleState,IpAddress:IpAddress}' \
    --output table \
    --region $AWS_REGION

echo ""
echo "🚀 Launching temporary EC2 instance to check EFS contents..."

# Create user data script for EFS mounting and content checking
cat > /tmp/efs-check-userdata.sh << 'EOF'
#!/bin/bash
exec > >(tee /var/log/efs-check.log) 2>&1

echo "🔧 Setting up EFS content checker..."
yum update -y
yum install -y amazon-efs-utils tree

echo "📁 Creating mount point..."
mkdir -p /mnt/efs

echo "🔗 Mounting EFS filesystem..."
if mount -t efs fs-07c9b65956846dd51:/ /mnt/efs; then
    echo "✅ EFS mounted successfully at /mnt/efs"
else
    echo "❌ Failed to mount EFS"
    exit 1
fi

# Wait a moment for mount to settle
sleep 2

echo "📋 EFS CONTENT ANALYSIS COMPLETE" > /tmp/efs-analysis-ready
EOF

# Launch EC2 instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.micro \
    --subnet-id $SUBNET_ID \
    --security-group-ids $SG_ID \
    --associate-public-ip-address \
    --user-data file:///tmp/efs-check-userdata.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=EFS-Content-Checker},{Key=Purpose,Value=Temporary-EFS-Analysis}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "🔄 EC2 Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for EC2 instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# Get instance public IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $AWS_REGION)

echo "✅ EC2 Instance running at: $INSTANCE_IP"

# Wait for user data script to complete EFS mounting
echo "⏳ Waiting for EFS mounting to complete..."
SETUP_COMPLETE=false
for i in {1..60}; do
    if aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["test -f /tmp/efs-analysis-ready && echo READY || echo WAITING"]' \
        --region $AWS_REGION &>/dev/null; then
        
        # Check if setup is complete
        sleep 5
        COMMAND_ID=$(aws ssm list-commands \
            --instance-id $INSTANCE_ID \
            --max-items 1 \
            --query 'Commands[0].CommandId' \
            --output text \
            --region $AWS_REGION 2>/dev/null)
        
        if [ "$COMMAND_ID" != "None" ] && [ "$COMMAND_ID" != "" ]; then
            RESULT=$(aws ssm get-command-invocation \
                --command-id $COMMAND_ID \
                --instance-id $INSTANCE_ID \
                --query 'StandardOutputContent' \
                --output text \
                --region $AWS_REGION 2>/dev/null || echo "")
            
            if [[ "$RESULT" == *"READY"* ]]; then
                SETUP_COMPLETE=true
                break
            fi
        fi
    fi
    
    echo "   Attempt $i/60 - EFS setup in progress..."
    sleep 5
done

if [ "$SETUP_COMPLETE" = false ]; then
    echo "⚠️ EFS setup taking longer than expected. Proceeding with direct SSH connection..."
fi

echo ""
echo "📋 EFS CONTENT ANALYSIS"
echo "========================"

# Function to run commands on the EC2 instance
run_on_instance() {
    local cmd="$1"
    local description="$2"
    
    echo ""
    echo "🔍 $description"
    echo "Command: $cmd"
    echo "---"
    
    # Try SSM first, fallback to SSH
    if aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"$cmd\"]" \
        --region $AWS_REGION &>/dev/null; then
        
        sleep 3
        COMMAND_ID=$(aws ssm list-commands \
            --instance-id $INSTANCE_ID \
            --max-items 1 \
            --query 'Commands[0].CommandId' \
            --output text \
            --region $AWS_REGION 2>/dev/null)
        
        if [ "$COMMAND_ID" != "None" ] && [ "$COMMAND_ID" != "" ]; then
            OUTPUT=$(aws ssm get-command-invocation \
                --command-id $COMMAND_ID \
                --instance-id $INSTANCE_ID \
                --query 'StandardOutputContent' \
                --output text \
                --region $AWS_REGION 2>/dev/null || echo "")
            
            if [ ! -z "$OUTPUT" ]; then
                echo "$OUTPUT"
                return 0
            fi
        fi
    fi
    
    # Fallback message
    echo "⚠️ Unable to execute command via SSM. Please connect manually to check:"
    echo "   ssh -i your-key.pem ec2-user@$INSTANCE_IP"
    echo "   Then run: $cmd"
}

# Check EFS mount status
run_on_instance "df -h /mnt/efs && echo '✅ EFS is mounted' || echo '❌ EFS not mounted'" "EFS Mount Status"

# Check EFS root directory contents
run_on_instance "ls -la /mnt/efs/" "EFS Root Directory Contents"

# Check if dumps directory exists
run_on_instance "ls -la /mnt/efs/dumps/ 2>/dev/null || echo 'dumps directory not found'" "EFS dumps/ Directory Contents"

# Count SQL files
run_on_instance "find /mnt/efs -name '*.sql' -type f | wc -l" "Total SQL Files Count"

# List all SQL files with sizes
run_on_instance "find /mnt/efs -name '*.sql' -type f -exec ls -lh {} \;" "All SQL Files with Sizes"

# Show directory tree structure
run_on_instance "tree /mnt/efs -L 3 2>/dev/null || find /mnt/efs -type d | head -20" "EFS Directory Structure"

# Check total EFS usage
run_on_instance "du -sh /mnt/efs" "Total EFS Storage Usage"

# Look for specific database dump files
run_on_instance "ls -lh /mnt/efs/dumps/proxy*.sql 2>/dev/null || echo 'No proxy SQL dumps found'" "Proxy Database Dumps"

# Check for any other file types
run_on_instance "find /mnt/efs -type f -not -name '*.sql' | head -10" "Non-SQL Files (first 10)"

# Check file permissions
run_on_instance "find /mnt/efs -name '*.sql' -exec ls -la {} \; | head -5" "SQL File Permissions (first 5)"

echo ""
echo "🎯 SUMMARY"
echo "=========="
echo "✅ EFS Filesystem: $EFS_ID"
echo "📍 Mount Point: /mnt/efs"
echo "🔗 EC2 Instance: $INSTANCE_ID (will be terminated automatically)"
echo "💻 Instance IP: $INSTANCE_IP"
echo ""
echo "💡 To manually explore the EFS contents:"
echo "   1. Connect: aws ssm start-session --target $INSTANCE_ID --region $AWS_REGION"
echo "   2. Or SSH: ssh -i your-key.pem ec2-user@$INSTANCE_IP"
echo "   3. Explore: cd /mnt/efs && ls -la"
echo ""
echo "🧹 The EC2 instance will be terminated automatically when this script exits."
echo "Press Ctrl+C to exit and cleanup, or wait 30 seconds for auto-cleanup..."

# Keep instance alive for manual inspection if needed
sleep 30

echo ""
echo "🏁 EFS content analysis complete!"
