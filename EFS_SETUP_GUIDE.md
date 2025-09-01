# AWS EFS Setup Guide for Proxy Outreach SQL Dumps

This guide walks you through creating an Elastic File System (EFS) and uploading your SQL dump files for use with ECS.

## Prerequisites

- AWS CLI configured with appropriate permissions
- SQL dump files generated (run `./generate_optimized_dumps.sh` if needed)
- VPC with at least one subnet (most AWS accounts have a default VPC)

## Step 1: Create EFS File System

### Option A: Using AWS CLI (Recommended)

```bash
# Set your region
export AWS_REGION="us-west-2"  # Change to your region

# Create EFS file system
EFS_ID=$(aws efs create-file-system \
    --creation-token proxy-outreach-dumps-$(date +%s) \
    --performance-mode generalPurpose \
    --throughput-mode provisioned \
    --provisioned-throughput-in-mibps 100 \
    --encrypted \
    --tags Key=Name,Value=proxy-outreach-dumps \
    --query 'FileSystemId' \
    --output text \
    --region $AWS_REGION)

echo "✅ EFS File System created: $EFS_ID"

# Wait for file system to be available
echo "⏳ Waiting for EFS to be available..."
aws efs wait file-system-available --file-system-id $EFS_ID --region $AWS_REGION
echo "✅ EFS is now available"
```

### EFS File System Policy (Optional)

**You typically DON'T need a file system policy for basic ECS usage.** The default behavior works fine when:
- Your ECS tasks run in the same VPC as the EFS mount targets
- You're using standard IAM roles for ECS tasks
- You don't need cross-account access

**You ONLY need a file system policy if you want to:**
- Restrict access to specific IAM users/roles
- Allow cross-account access
- Deny certain actions (like deletion)
- Require encryption in transit

#### Example File System Policy (Only if needed):

```bash
# Only create this if you need additional access restrictions
cat > efs-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/ecsTaskExecutionRole"
            },
            "Action": [
                "elasticfilesystem:ClientMount",
                "elasticfilesystem:ClientWrite"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Deny",
            "Principal": "*",
            "Action": "elasticfilesystem:DeleteFileSystem",
            "Resource": "*"
        }
    ]
}
EOF

# Apply the policy (only if you created one above)
aws efs put-file-system-policy \
    --file-system-id $EFS_ID \
    --policy file://efs-policy.json \
    --region $AWS_REGION
```

**Recommendation:** Skip the file system policy for your use case. The default settings with proper security groups and IAM roles are sufficient.

### Option B: Using AWS Console

1. Go to [AWS EFS Console](https://console.aws.amazon.com/efs/)
2. Click "Create file system"
3. Choose "Customize" for more options
4. Configure:
   - **Name**: `proxy-outreach-dumps`
   - **Performance mode**: General Purpose
   - **Throughput mode**: Provisioned (100 MiB/s)
   - **Encryption**: Enable encryption at rest
5. Click "Next" and configure network settings (use default VPC)
6. Click "Next" through remaining screens and "Create"

## Step 2: Create Mount Targets

Mount targets allow your ECS tasks to access the EFS file system.

### Get Your VPC Information

**Where to run these commands:**
- AWS CloudShell (recommended)
- Local terminal with AWS CLI installed
- Or use AWS Console to find VPC info manually

**CLI Commands:**

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=is-default,Values=true" \
    --query 'Vpcs[0].VpcId' \
    --output text \
    --region $AWS_REGION)

echo "Default VPC ID: $VPC_ID"

# Get subnets in your VPC
aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' \
    --output table \
    --region $AWS_REGION
```

**Manual Method (AWS Console):**
1. Go to [VPC Console](https://console.aws.amazon.com/vpc/)
2. Click "Your VPCs" → Note the VPC ID marked as "Default: Yes"
3. Click "Subnets" → Note subnet IDs in your default VPC

### Create Security Group for EFS

**Where to run these commands:**

#### Option A: AWS CloudShell (Easiest - No setup required)
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Click the CloudShell icon (terminal icon) in the top navigation bar
3. CloudShell opens with AWS CLI pre-installed and authenticated
4. Copy and paste the commands below

#### Option B: Local Machine with AWS CLI
1. Install AWS CLI: `pip install awscli` or download from [AWS](https://aws.amazon.com/cli/)
2. Configure: `aws configure` (enter your access key, secret, region)
3. Run the commands below

#### Option C: AWS Console (Manual setup)
If you prefer using the web interface, see the manual instructions after the CLI commands.

**CLI Commands (run in CloudShell or local terminal):**

```bash
# Create security group for EFS
SG_ID=$(aws ec2 create-security-group \
    --group-name proxy-outreach-efs-sg \
    --description "Security group for Proxy Outreach EFS" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION)

echo "Security Group created: $SG_ID"

# Allow NFS traffic (port 2049) from VPC
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 2049 \
    --cidr $(aws ec2 describe-vpcs --vpc-ids $VPC_ID --query 'Vpcs[0].CidrBlock' --output text) \
    --region $AWS_REGION

echo "✅ Security group configured for NFS access"
```

#### Manual Setup via AWS Console (Alternative)

If you prefer using the AWS Console instead of CLI:

1. **Go to EC2 Console** → Security Groups
2. **Click "Create security group"**
3. **Configure:**
   - Name: `proxy-outreach-efs-sg`
   - Description: `Security group for Proxy Outreach EFS`
   - VPC: Select your default VPC
4. **Add Inbound Rule:**
   - Type: Custom TCP
   - Port: 2049
   - Source: Custom → Enter your VPC CIDR (e.g., 172.31.0.0/16)
   - Description: NFS for EFS
5. **Click "Create security group"**
6. **Note the Security Group ID** for later use

### Create Mount Targets for Each Subnet

```bash
# Get subnets and create mount targets
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].SubnetId' \
    --output text \
    --region $AWS_REGION)

for SUBNET_ID in $SUBNET_IDS; do
    echo "Creating mount target for subnet: $SUBNET_ID"
    MOUNT_TARGET_ID=$(aws efs create-mount-target \
        --file-system-id $EFS_ID \
        --subnet-id $SUBNET_ID \
        --security-groups $SG_ID \
        --query 'MountTargetId' \
        --output text \
        --region $AWS_REGION 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "✅ Mount target created: $MOUNT_TARGET_ID"
    else
        echo "⚠️  Mount target may already exist for subnet: $SUBNET_ID"
    fi
done

echo "⏳ Waiting for mount targets to be available..."
sleep 30
```

## Step 3: Upload SQL Dumps to EFS

You have several options to upload files to EFS:

### Option A: Using EC2 Instance (Recommended)

```bash
# Launch a small EC2 instance for file transfer
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \  # Amazon Linux 2 AMI (update for your region)
    --instance-type t3.micro \
    --key-name your-key-pair \  # Replace with your key pair name
    --subnet-id $(echo $SUBNET_IDS | cut -d' ' -f1) \
    --security-group-ids $SG_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=EFS-Upload-Instance}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "EC2 Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for EC2 instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# Get instance public IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $AWS_REGION)

echo "✅ EC2 Instance ready: $INSTANCE_IP"
```

#### Connect to EC2 and Mount EFS

```bash
# SSH to the instance (replace your-key.pem with your key file)
ssh -i your-key.pem ec2-user@$INSTANCE_IP

# On the EC2 instance, install EFS utils
sudo yum update -y
sudo yum install -y amazon-efs-utils

# Create mount point
sudo mkdir -p /mnt/efs

# Mount EFS (replace $EFS_ID with your actual EFS ID)
sudo mount -t efs $EFS_ID:/ /mnt/efs

# Create dumps directory
sudo mkdir -p /mnt/efs/dumps
sudo chmod 755 /mnt/efs/dumps

# Verify mount
df -h /mnt/efs
```

#### Upload Files to EC2 and Copy to EFS

From your local machine:

```bash
# Create dumps archive for easier transfer
./deploy.sh --create-archive

# Upload archive to EC2
scp -i your-key.pem proxy-outreach-dumps.tar.gz ec2-user@$INSTANCE_IP:~/

# SSH back to EC2 and extract to EFS
ssh -i your-key.pem ec2-user@$INSTANCE_IP

# On EC2: Extract dumps to EFS
cd /home/ec2-user
tar -xzf proxy-outreach-dumps.tar.gz
sudo cp docker/*.sql /mnt/efs/dumps/
sudo chmod 644 /mnt/efs/dumps/*.sql

# Verify files
ls -la /mnt/efs/dumps/
```

### Option B: Using AWS DataSync (For Large Files)

```bash
# Create DataSync location for EFS
EFS_LOCATION_ARN=$(aws datasync create-location-efs \
    --efs-filesystem-arn arn:aws:elasticfilesystem:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):file-system/$EFS_ID \
    --ec2-config SubnetArn=arn:aws:ec2:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):subnet/$(echo $SUBNET_IDS | cut -d' ' -f1),SecurityGroupArns=[arn:aws:ec2:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):security-group/$SG_ID] \
    --query 'LocationArn' \
    --output text \
    --region $AWS_REGION)

echo "DataSync EFS location created: $EFS_LOCATION_ARN"
```

**Important:** DataSync requires an IAM role for S3 access. If you don't have this role, create it first:

```bash
# Create IAM role for DataSync S3 access
cat > trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "datasync.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create the role
aws iam create-role \
    --role-name DataSyncS3BucketAccessRole \
    --assume-role-policy-document file://trust-policy.json

# Attach S3 access policy
aws iam attach-role-policy \
    --role-name DataSyncS3BucketAccessRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

echo "✅ IAM role created for DataSync"
```

**Alternative: Use EC2 instance for simpler setup**

If you get IAM permission errors with DataSync, the EC2 approach is simpler:

```bash
# Quick EC2 transfer (no IAM role setup needed)
# Use the commands from Step 3C Option 1 above
aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/
```

### Option C: Using Local Mount (Linux/Mac with EFS Utils)

```bash
# Install EFS utils (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y git binutils
git clone https://github.com/aws/efs-utils
cd efs-utils
./build-deb.sh
sudo apt-get install -y ./build/amazon-efs-utils*deb

# Create local mount point  
sudo mkdir -p /mnt/efs

# Mount EFS locally (requires VPN or direct connection to AWS VPC)
sudo mount -t efs $EFS_ID:/ /mnt/efs

# Copy dumps
sudo mkdir -p /mnt/efs/dumps
sudo cp docker/*.sql /mnt/efs/dumps/
```

### Option D: Using AWS Lambda Function (Serverless)

For smaller files, you can use Lambda with EFS mounting:

```bash
# Create Lambda function that mounts EFS and transfers from S3
# Note: Lambda has 15-minute timeout, so only suitable for smaller files
cat > lambda-s3-efs-transfer.py << 'EOF'
import boto3
import os
import subprocess

def lambda_handler(event, context):
    # Mount EFS (Lambda can mount EFS directly)
    efs_mount_point = '/mnt/efs'
    os.makedirs(efs_mount_point, exist_ok=True)
    
    # Download from S3 and upload to EFS
    s3 = boto3.client('s3')
    bucket = event['bucket']
    key = event['key']
    
    # Download to /tmp
    local_path = f'/tmp/{os.path.basename(key)}'
    s3.download_file(bucket, key, local_path)
    
    # Copy to EFS
    efs_path = f'{efs_mount_point}/dumps/{os.path.basename(key)}'
    subprocess.run(['cp', local_path, efs_path])
    subprocess.run(['chmod', '644', efs_path])
    
    return {'statusCode': 200, 'body': f'Transferred {key} to EFS'}
EOF
```

### Option E: Temporary EC2 with Auto-Termination

If you want minimal EC2 management, create a "disposable" instance that auto-terminates:

```bash
# Create user data script for auto-upload and termination
cat > upload-script.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y amazon-efs-utils

# Mount EFS
mkdir -p /mnt/efs
mount -t efs fs-07c9b65956846dd51:/ /mnt/efs
mkdir -p /mnt/efs/dumps

# Transfer from S3 to EFS
aws s3 sync s3://your-bucket-name/ /mnt/efs/dumps/ --include "*.sql"
chmod 644 /mnt/efs/dumps/*.sql

# Verify transfer
ls -lh /mnt/efs/dumps/ > /tmp/transfer-log.txt
aws s3 cp /tmp/transfer-log.txt s3://your-bucket-name/transfer-completed.log

# Auto-terminate this instance
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region us-east-1
EOF

# Launch instance with auto-termination script
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.micro \
    --subnet-id subnet-048b863399f44469a \
    --security-group-ids sg-0801976936653c8c1 \
    --iam-instance-profile Name=EC2-S3-EFS-Role \
    --user-data file://upload-script.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Auto-Upload-S3-to-EFS}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region us-east-1)

echo "🚀 Auto-upload instance launched: $INSTANCE_ID"
echo "📝 Instance will terminate automatically after upload completes"
echo "📋 Check S3 for 'transfer-completed.log' to confirm completion"
```

## 🚀 Recommended: Simple EC2 Transfer (Works in All Environments)

Since you're in a corporate AWS environment, let's use the reliable EC2 approach:

### Step 1: Create IAM Role for EC2 S3 Access

**Option A: Using AWS CLI**
```bash
# Create trust policy for EC2
cat > ec2-trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create IAM role for EC2 S3 access
aws iam create-role \
    --role-name EC2-S3-EFS-AccessRole \
    --assume-role-policy-document file://ec2-trust-policy.json \
    --description "Allows EC2 to access S3 for EFS transfers"

# Attach policies
aws iam attach-role-policy \
    --role-name EC2-S3-EFS-AccessRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

aws iam attach-role-policy \
    --role-name EC2-S3-EFS-AccessRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

echo "✅ IAM role created"
echo "⏳ Wait 10 seconds for IAM propagation..."
sleep 10
```

**Option B: Using AWS Console (If CLI restricted)**
1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → Roles
2. Click "Create role"
3. Select "AWS service" → "EC2" → Next
4. Attach policies:
   - `AmazonS3ReadOnlyAccess` (for S3 access)
   - `AmazonSSMManagedInstanceCore` (for Session Manager)
5. Role name: `EC2-S3-EFS-AccessRole`
6. Create role
7. Go to "Instance profiles" and create profile `EC2-S3-EFS-Profile`
8. Add the role to the instance profile

### Step 2: Launch EC2 with IAM Role

```bash
# Set up your environment
export AWS_REGION="us-east-1"
export EFS_ID="fs-07c9b65956846dd51"
export SUBNET_ID="subnet-048b863399f44469a"
export SG_ID="sg-0801976936653c8c1"

# Launch EC2 instance with IAM role for S3 access
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.micro \
    --subnet-id $SUBNET_ID \
    --security-group-ids $SG_ID \
    --iam-instance-profile Name=EC2-S3-EFS-Profile \
    --associate-public-ip-address \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=S3-to-EFS-Transfer}]' \
    --user-data '#!/bin/bash
yum update -y
yum install -y amazon-efs-utils
mkdir -p /mnt/efs
mount -t efs fs-07c9b65956846dd51:/ /mnt/efs
mkdir -p /mnt/efs/dumps
echo "EFS mounted successfully" > /tmp/setup-complete.log' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "🚀 EC2 Instance launched: $INSTANCE_ID"

# Wait for instance
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# Get connection info
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $AWS_REGION)

echo "✅ EC2 Instance ready!"
echo "🔗 Instance IP: $INSTANCE_IP"
echo "📋 Instance ID: $INSTANCE_ID"
echo ""
echo "🎯 Connect and transfer your SQL dump:"
echo "1. Wait 2-3 minutes for setup to complete"
echo "2. Connect via Session Manager (recommended - no SSH keys needed):"
echo "   aws ssm start-session --target $INSTANCE_ID --region $AWS_REGION"
echo ""
echo "3. Or connect via SSH (if you have a key pair):"
echo "   ssh -i your-key.pem ec2-user@$INSTANCE_IP"
echo ""
echo "4. Run on EC2 to transfer from S3:"
echo "   aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/"
echo "   chmod 644 /mnt/efs/dumps/proxy_complete_dump.sql"
echo "   ls -lh /mnt/efs/dumps/  # Verify transfer"
echo ""
echo "5. Clean up when done:"
echo "   aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION"
```

### Step 3: Verify S3 Access and Transfer

Once connected to your EC2 instance:

```bash
# Test S3 access
aws s3 ls s3://dsdemo-proxy-sqldump/

# Expected output: Should show your proxy_complete_dump.sql file

# Transfer the SQL dump
aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/

# Set proper permissions
chmod 644 /mnt/efs/dumps/proxy_complete_dump.sql

# Verify the transfer
ls -lh /mnt/efs/dumps/
```

### Troubleshooting S3 Access Issues

If you get S3 access denied errors:

```bash
# Check if your IAM role has the necessary permissions
aws iam list-attached-role-policies --role-name EC2-S3-EFS-AccessRole

# Check if the policy AmazonS3ReadOnlyAccess is attached
```

**Common Issues:**
- ❌ **"Unable to locate credentials"** → IAM role not attached to EC2
- ❌ **"Access denied"** → IAM role doesn't have S3 permissions  
- ❌ **"Session Manager connection failed"** → Missing SSM permissions

**Solutions:**
- ✅ Verify instance profile is attached: `EC2-S3-EFS-Profile`
- ✅ Check IAM role has required policies attached
- ✅ Wait for IAM propagation (can take up to 10 minutes)

### Clean Up IAM Resources (Optional)

When you're done with transfers:

```bash
# Remove role from instance profile
aws iam remove-role-from-instance-profile \
    --instance-profile-name EC2-S3-EFS-Profile \
    --role-name EC2-S3-EFS-AccessRole

# Delete instance profile
aws iam delete-instance-profile \
    --instance-profile-name EC2-S3-EFS-Profile

# Detach policies from role
aws iam detach-role-policy \
    --role-name EC2-S3-EFS-AccessRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

aws iam detach-role-policy \
    --role-name EC2-S3-EFS-AccessRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Delete the role
aws iam delete-role --role-name EC2-S3-EFS-AccessRole

echo "🧹 IAM resources cleaned up"
```

**Why EC2 works better in your environment:**
- ✅ No special IAM roles required for DataSync
- ✅ Uses your existing security groups
- ✅ Session Manager works without SSH keys
- ✅ Simple and reliable
- ✅ Works with Service Control Policies
- ✅ IAM role for S3 access is straightforward to create

## Step 4: Configure ECS Task Definition

Update your ECS task definition to use the EFS:

```json
{
    "family": "proxy-outreach-efs",
    "volumes": [
        {
            "name": "dumps-volume",
            "efsVolumeConfiguration": {
                "fileSystemId": "fs-your-efs-id",
                "rootDirectory": "/dumps"
            }
        }
    ],
    "containerDefinitions": [
        {
            "name": "proxy-outreach",
            "mountPoints": [
                {
                    "sourceVolume": "dumps-volume",
                    "containerPath": "/usr/src/app/data/dumps"
                }
            ]
        }
    ]
}
```

## Complete Automation Script

Save this as `setup-efs-complete.sh`:

```bash
#!/bin/bash
set -e

# Complete EFS setup automation
AWS_REGION="${AWS_REGION:-us-west-2}"
KEY_NAME="${KEY_NAME:-your-key-pair}"  # Set your key pair name

echo "🚀 Setting up EFS for Proxy Outreach SQL Dumps"

# Create EFS
EFS_ID=$(aws efs create-file-system \
    --creation-token proxy-outreach-$(date +%s) \
    --performance-mode generalPurpose \
    --throughput-mode provisioned \
    --provisioned-throughput-in-mibps 100 \
    --encrypted \
    --tags Key=Name,Value=proxy-outreach-dumps \
    --query 'FileSystemId' \
    --output text \
    --region $AWS_REGION)

echo "✅ EFS created: $EFS_ID"

# Get VPC info
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)

# Create security group
SG_ID=$(aws ec2 create-security-group \
    --group-name proxy-outreach-efs-sg \
    --description "Security group for Proxy Outreach EFS" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION)

# Configure security group
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 2049 \
    --cidr $(aws ec2 describe-vpcs --vpc-ids $VPC_ID --query 'Vpcs[0].CidrBlock' --output text) \
    --region $AWS_REGION

# Create mount targets
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region $AWS_REGION)

for SUBNET_ID in $SUBNET_IDS; do
    aws efs create-mount-target \
        --file-system-id $EFS_ID \
        --subnet-id $SUBNET_ID \
        --security-groups $SG_ID \
        --region $AWS_REGION 2>/dev/null || true
done

echo "✅ EFS setup complete!"
echo "📝 EFS ID: $EFS_ID"
echo "📝 Security Group: $SG_ID"
echo ""
echo "🚀 Next steps:"
echo "1. Create dumps archive: ./deploy.sh --create-archive"
echo "2. Launch EC2 instance for upload (or use the provided commands)"
echo "3. Upload dumps to EFS"
echo "4. Use EFS ID in your ECS task definition"
```

## Troubleshooting

### Common Issues:

1. **Mount fails**: Check security group allows port 2049 from your ECS subnets
2. **Permission denied**: Ensure files have correct permissions (644 for files, 755 for directories)
3. **Slow upload**: Consider using compression and parallel uploads for large files
4. **ECS can't access EFS**: Ensure ECS tasks are in subnets with EFS mount targets
5. **Access denied errors**: Usually means security group misconfiguration, NOT file system policy issues

### Access Control Troubleshooting:

```bash
# Check if your security group allows NFS
aws ec2 describe-security-groups --group-ids $SG_ID --query 'SecurityGroups[0].IpPermissions'

# Verify ECS task execution role has basic permissions (should be automatic)
aws iam get-role --role-name ecsTaskExecutionRole

# Test EFS connectivity from EC2 (replace with actual values)
# From inside your VPC:
telnet your-efs-id.efs.us-west-2.amazonaws.com 2049
```

**99% of EFS access issues are security group problems, not policy problems.**

### Useful Commands:

```bash
# Check EFS file systems
aws efs describe-file-systems --region $AWS_REGION

# Check mount targets
aws efs describe-mount-targets --file-system-id $EFS_ID --region $AWS_REGION

# Monitor EFS performance
aws cloudwatch get-metric-statistics \
    --namespace AWS/EFS \
    --metric-name DataReadIOBytes \
    --dimensions Name=FileSystemId,Value=$EFS_ID \
    --start-time 2025-08-27T00:00:00Z \
    --end-time 2025-08-27T23:59:59Z \
    --period 3600 \
    --statistics Sum
```

## EFS Access Control Overview

EFS access is controlled through **three layers**:

### 1. Network Access (Security Groups) - REQUIRED
- Controls which resources can connect to EFS mount targets
- Must allow port 2049 (NFS) from your ECS subnets
- **This is what we set up above and is sufficient for most cases**

### 2. IAM Permissions - AUTOMATIC for ECS
- ECS tasks automatically get the necessary permissions when they have proper execution roles
- No additional IAM setup needed for basic ECS usage

### 3. File System Policies - OPTIONAL
- Additional layer for fine-grained access control
- **NOT needed for standard ECS deployments**
- Only use for complex security requirements

### Summary for Your Use Case

✅ **What you need:** Security groups (covered in Step 2)  
❌ **What you don't need:** File system policies  
❌ **What you don't need:** Custom IAM policies  

The default EFS permissions work perfectly with ECS when using standard IAM roles.

This guide should get your EFS set up and SQL dumps uploaded successfully!

## Quick Start with AWS Console Only

If you don't want to use CLI commands at all, here's how to set up everything through the AWS Console:

### 1. Create EFS File System (Console)
1. Go to [AWS EFS Console](https://console.aws.amazon.com/efs/)
2. Click "Create file system"
3. Choose "Customize"
4. Configure:
   - **Name**: `proxy-outreach-dumps`
   - **Performance mode**: General Purpose
   - **Throughput mode**: Provisioned (100 MiB/s)
   - **Encryption**: Enable encryption at rest
5. Click "Next" → Configure network (use default VPC)
6. Click "Next" → Review and "Create"

### 2. Create Security Group (Console)
1. Go to [EC2 Console](https://console.aws.amazon.com/ec2/) → Security Groups
2. Click "Create security group"
3. Configure:
   - **Name**: `proxy-outreach-efs-sg`
   - **Description**: `Security group for Proxy Outreach EFS`
   - **VPC**: Select `vpc-0413a65a733c586b4` (your VPC)
4. **Add Inbound Rule**:
   - Type: Custom TCP
   - Port: 2049
   - Source: Custom → Enter your VPC CIDR (find it in VPC console)
   - Description: NFS for EFS
5. Click "Create security group"
6. **Note the Security Group ID** that gets created

### 3. Update EFS Mount Targets (Console)
1. Back in EFS Console → Click your file system
2. Go to "Network" tab
3. For each mount target, click "Manage"
4. Update security group to use `proxy-outreach-efs-sg`
5. Save changes

**This console-only approach achieves the same result as the CLI commands!**

## Current Status Update ✅

**Your EFS Configuration:**
- EFS ID: `fs-07c9b65956846dd51` ✅ Created
- Mount Targets: ✅ **COMPLETED AND READY**
  - `fsmt-00f1ca66c6f8cc91c` in `subnet-048b863399f44469a` (us-east-1a) → IP: `10.46.229.31`
  - `fsmt-00be68a8c196ee5b1` in `subnet-0dbcc372999c8c0f5` (us-east-1b) → IP: `10.46.229.86`
- Security Groups: ✅ `sg-0801976936653c8c1` (BR-AWS-Service) attached to both mount targets

**🎉 EFS Networking Setup Complete!** Your EFS is now ready for SQL dump uploads.

### ✅ EFS Mount Targets Successfully Configured

**Verification Complete!** Both mount targets now have the BR-AWS-Service security group attached:

```
Availability Zone | Mount Target ID        | Subnet ID             | Security Group
us-east-1a         | fsmt-00f1ca66c6f8cc91c | subnet-048b863399f44 | sg-0801976936653c8c1 (BR-AWS-Service)
us-east-1b         | fsmt-00be68a8c196ee5b1 | subnet-0dbcc372999c8 | sg-0801976936653c8c1 (BR-AWS-Service)
```

**Network Details:**
- Mount Target 1: `10.46.229.31` (us-east-1a)
- Mount Target 2: `10.46.229.86` (us-east-1b)
- Both accessible via NFS protocol on port 2049

**🚀 Ready for Step 3: Upload SQL Dumps to EFS**

## Quick Test: Upload One SQL Dump ⚡

Let's test with one SQL dump first to verify everything works:

### Step 3A: Launch EC2 Instance for Testing

```bash
# Your confirmed configuration
export AWS_REGION="us-east-1"
export VPC_ID="vpc-0413a65a733c586b4"
export EFS_ID="fs-07c9b65956846dd51"  # ✅ Already created
export VPC_CIDR="10.46.229.0/24"      # ✅ Confirmed

# Get one of your subnets for EC2 launch
SUBNET_ID="subnet-048b863399f44469a"  # us-east-1a subnet

# Launch a small EC2 instance for testing
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.micro \
    --subnet-id $SUBNET_ID \
    --security-group-ids $SG_ID \
    --associate-public-ip-address \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=EFS-Test-Upload}]' \
    --user-data '#!/bin/bash
yum update -y
yum install -y amazon-efs-utils
mkdir -p /mnt/efs
mount -t efs fs-07c9b65956846dd51:/ /mnt/efs
mkdir -p /mnt/efs/dumps
echo "EFS mounted successfully" > /tmp/setup-complete.log' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "🚀 EC2 Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for EC2 instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# Get instance public IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $AWS_REGION)

echo "✅ EC2 Instance ready: $INSTANCE_IP"
echo "📝 Save these for later:"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $INSTANCE_IP"
```

### Step 3B: Connect and Mount EFS

**Connection Options:**

#### Option 1: Session Manager (Recommended - No SSH keys needed)
```bash
# Connect via Session Manager (if SSM is working)
aws ssm start-session --target $INSTANCE_ID --region $AWS_REGION
```

#### Option 2: SSH (Fallback if Session Manager fails)
```bash
# Connect to the instance (replace 'your-key.pem' with your actual key file)
ssh -i your-key.pem ec2-user@$INSTANCE_IP
```

**Note:** If Session Manager fails with "SSM Agent was unable to connect", see troubleshooting section below.

**Once connected to EC2, run these commands:**

```bash
# Create mount point
sudo mkdir -p /mnt/efs

# Mount EFS using the file system ID
sudo mount -t efs fs-07c9b65956846dd51:/ /mnt/efs

# Verify the mount worked
df -h /mnt/efs

# Create dumps directory
sudo mkdir -p /mnt/efs/dumps
sudo chmod 755 /mnt/efs/dumps

# Test write access
sudo touch /mnt/efs/dumps/test.txt
sudo chmod 644 /mnt/efs/dumps/test.txt
ls -la /mnt/efs/dumps/

echo "✅ EFS mounted successfully!"
```

### 🚨 EFS Mount Timeout Troubleshooting

If you get **"Mount attempt failed due to timeout after 15 sec"** errors, run these actual diagnostic commands on your EC2 instance:

#### Step 1: Test Network Connectivity to Mount Targets

```bash
# Option 1: Using nc (netcat) - usually available by default
nc -z -v 10.46.229.31 2049  # Mount target in us-east-1a
nc -z -v 10.46.229.86 2049  # Mount target in us-east-1b

# Option 2: Using timeout with bash (if nc not available)
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/10.46.229.31/2049' && echo "Port 2049 open on 10.46.229.31" || echo "Port 2049 closed/filtered on 10.46.229.31"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/10.46.229.86/2049' && echo "Port 2049 open on 10.46.229.86" || echo "Port 2049 closed/filtered on 10.46.229.86"

# Option 3: Install telnet if you prefer (Amazon Linux)
sudo yum install -y telnet
telnet 10.46.229.31 2049
telnet 10.46.229.86 2049

# If connection succeeds, you'll see "Connected" or similar
# If it times out, there's a network connectivity issue
```

#### Step 2: Check DNS Resolution

```bash
# Test DNS resolution for your EFS filesystem
nslookup fs-07c9b65956846dd51.efs.us-east-1.amazonaws.com
dig fs-07c9b65956846dd51.efs.us-east-1.amazonaws.com

# Should return IP addresses of your mount targets
```

#### Step 3: Verify Security Group Configuration

```bash
# Check if your security group allows NFS traffic
aws ec2 describe-security-groups \
    --group-ids sg-0801976936653c8c1 \
    --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
    --output table \
    --region us-east-1

# Should show TCP port 2049 allowed from your VPC CIDR (10.46.229.0/24)
```

#### Step 4: Check Route Table

```bash
# Verify your subnet has proper routing
aws ec2 describe-route-tables \
    --filters "Name=association.subnet-id,Values=subnet-048b863399f44469a" \
    --query 'RouteTables[0].Routes[*].[DestinationCidrBlock,GatewayId,NatGatewayId]' \
    --output table \
    --region us-east-1

# Should show routes for internet access or VPC endpoints
```

#### Step 5: Try Alternative Mount Commands

```bash
# Try mounting with different options
sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,intr,timeo=600 \
    fs-07c9b65956846dd51.efs.us-east-1.amazonaws.com:/ /mnt/efs

# Or try mounting using IP address directly
sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,intr,timeo=600 \
    10.46.229.31:/ /mnt/efs
```

#### Step 6: Check EFS Mount Helper Debug

```bash
# Enable debug logging for EFS mount helper
echo "fs-07c9b65956846dd51.efs.us-east-1.amazonaws.com:/ /mnt/efs efs defaults,_netdev" | sudo tee -a /etc/fstab

# Try mounting with debug
sudo mount -v -t efs fs-07c9b65956846dd51:/ /mnt/efs

# Check system logs for detailed error messages
sudo journalctl -f &
sudo mount -t efs fs-07c9b65956846dd51:/ /mnt/efs
```

### Common Solutions for Mount Timeouts:

1. **Security Group Issue**: Add NFS rule to security group
   ```bash
   aws ec2 authorize-security-group-ingress \
       --group-id sg-0801976936653c8c1 \
       --protocol tcp \
       --port 2049 \
       --cidr 10.46.229.0/24 \
       --region us-east-1
   ```

2. **Network Routing Issue**: Ensure subnet has internet access or VPC endpoints

3. **EFS Mount Helper Issue**: Install latest version
   ```bash
   sudo yum update -y amazon-efs-utils
   ```

4. **Use Regional Mount Target**: Try specific availability zone
   ```bash
   sudo mount -t efs fs-07c9b65956846dd51.efs.us-east-1.amazonaws.com:/ /mnt/efs
   ```

### Step 3C: Upload One Test SQL Dump

Choose your smallest SQL dump for testing. You have two options:

#### Option 1: From S3 to EFS (Recommended if files are in S3)

```bash
# First, connect to your EC2 instance
ssh -i your-key.pem ec2-user@$INSTANCE_IP

# On EC2: List your S3 bucket to see available dumps
aws s3 ls s3://dsdemo-proxy-sqldump/

# Download your SQL dump from S3 to EFS directly
aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/

# Set proper permissions
chmod 644 /mnt/efs/dumps/proxy_complete_dump.sql

# Verify the file
ls -lh /mnt/efs/dumps/
```

#### Option 2: From Local Machine to EFS

```bash
# Find your smallest SQL dump locally
ls -lh docker/*.sql | head -5

# Upload one SQL dump (replace with your actual file and key)
scp -i your-key.pem docker/[your-smallest-dump].sql ec2-user@$INSTANCE_IP:~/

# SSH back to EC2 and copy to EFS
ssh -i your-key.pem ec2-user@$INSTANCE_IP

# On EC2: Copy the dump to EFS
sudo cp ~/[your-smallest-dump].sql /mnt/efs/dumps/
sudo chmod 644 /mnt/efs/dumps/[your-smallest-dump].sql

# Verify the file
ls -lh /mnt/efs/dumps/
```

**S3 to EFS Transfer Benefits:**
- ✅ Much faster than local upload (AWS internal network)
- ✅ No need to upload large files from your local machine
- ✅ Can leverage AWS CLI parallelization for multiple files
- ✅ Bandwidth costs are minimal within same region

### Step 3D: Test EFS Persistence

```bash
# On EC2: Unmount and remount to test persistence
sudo umount /mnt/efs
sudo mount -t efs fs-07c9b65956846dd51:/ /mnt/efs

# Check if files are still there
ls -la /mnt/efs/dumps/

# Should see your SQL dump file!
```

### Step 3E: Clean Up Test Resources

```bash
# Terminate the test EC2 instance when done
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $AWS_REGION

echo "✅ Test complete! EFS is working properly."
```

## Ready-to-Run Commands for Your Setup ✅

Since you have already created your EFS and have all the details, here are the exact commands to complete your setup:

```bash
# Your confirmed configuration
export AWS_REGION="us-east-1"
export VPC_ID="vpc-0413a65a733c586b4"
export EFS_ID="fs-07c9b65956846dd51"  # ✅ Already created
export VPC_CIDR="10.46.229.0/24"      # ✅ Confirmed

# Step 1: Check current mount targets (see what's already configured)
aws efs describe-mount-targets --file-system-id $EFS_ID --region $AWS_REGION --query 'MountTargets[*].[MountTargetId,SubnetId,LifeCycleState,SecurityGroups]' --output table

# Step 2: Check existing security groups
aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[*].[GroupId,GroupName,Description]' \
    --output table \
    --region $AWS_REGION

# Step 3: Get available subnets
aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' \
    --output table \
    --region $AWS_REGION
```

**Next Actions:**
1. Run the commands above to see what's already configured
2. If you need to create a security group via console (due to CLI restrictions), use:
   - **Name**: `proxy-outreach-efs-sg`
   - **VPC**: `vpc-0413a65a733c586b4`
   - **Inbound Rule**: TCP port 2049 from `10.46.229.0/24`
3. Proceed to Step 3 (Upload SQL Dumps) once networking is configured

---

## S3 to EFS Transfer Guide 🚀

If your SQL dumps are already in S3, this is the fastest and most efficient way to get them into EFS:

### Option A: Single File Transfer (Testing)

```bash
# Connect to your EC2 instance
ssh -i your-key.pem ec2-user@$INSTANCE_IP

# On EC2: Transfer your SQL dump from S3 to EFS (use sudo for write permissions)
sudo aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/

# Set proper permissions
sudo chmod 644 /mnt/efs/dumps/proxy_complete_dump.sql

# Verify
ls -lh /mnt/efs/dumps/
```

### Option B: Bulk Transfer (All SQL Dumps)

```bash
# Transfer your specific SQL dump from S3 to EFS (use sudo for write permissions)
sudo aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/

# Or if you have multiple SQL dumps in the bucket:
sudo aws s3 sync s3://dsdemo-proxy-sqldump/ /mnt/efs/dumps/ --exclude "*" --include "*.sql"

# Set permissions for all files
sudo chmod 644 /mnt/efs/dumps/*.sql

# Verify all files
ls -lh /mnt/efs/dumps/
du -sh /mnt/efs/dumps/
```

### Option C: Parallel Transfer (Fastest for Large Files)

```bash
# For very large files, use parallel transfers
aws configure set default.s3.max_concurrent_requests 20
aws configure set default.s3.multipart_threshold 64MB
aws configure set default.s3.multipart_chunksize 16MB

# Then transfer your SQL dump (use sudo for write permissions)
sudo aws s3 cp s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql /mnt/efs/dumps/
```

### Option D: Using AWS DataSync (Enterprise-grade, No EC2 Management)

**Note: DataSync requires IAM role permissions that may be restricted in corporate environments.**

If you encounter IAM role errors, **skip to Option E (EC2 method)** which is simpler and more reliable for corporate AWS accounts.

```bash
# Your configuration
export AWS_REGION="us-east-1"
export EFS_ID="fs-07c9b65956846dd51"
export VPC_ID="vpc-0413a65a733c586b4"
export SUBNET_ID="subnet-048b863399f44469a"
export SG_ID="sg-0801976936653c8c1"
export S3_BUCKET="dsdemo-proxy-sqldump"  # Your actual bucket

# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

**Important:** DataSync requires an IAM role for S3 access. If you get permission errors, use the EC2 method instead.

```bash
# Create IAM role for DataSync S3 access (may fail in corporate environments)
cat > trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "datasync.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create the role
aws iam create-role \
    --role-name DataSyncS3BucketAccessRole \
    --assume-role-policy-document file://trust-policy.json

# Attach S3 access policy
aws iam attach-role-policy \
    --role-name DataSyncS3BucketAccessRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

echo "✅ IAM role created for DataSync"

# Create DataSync S3 location (requires IAM role for DataSync)
SOURCE_LOCATION=$(aws datasync create-location-s3 \
    --s3-bucket-arn arn:aws:s3:::dsdemo-proxy-sqldump \
    --s3-config BucketAccessRoleArn=arn:aws:iam::$ACCOUNT_ID:role/DataSyncS3BucketAccessRole \
    --query 'LocationArn' \
    --output text \
    --region $AWS_REGION)

echo "✅ S3 Location created: $SOURCE_LOCATION"
```

# Create DataSync EFS location
DEST_LOCATION=$(aws datasync create-location-efs \
    --efs-filesystem-arn arn:aws:elasticfilesystem:$AWS_REGION:$ACCOUNT_ID:file-system/$EFS_ID \
    --ec2-config SubnetArn=arn:aws:ec2:$AWS_REGION:$ACCOUNT_ID:subnet/$SUBNET_ID,SecurityGroupArns=[arn:aws:ec2:$AWS_REGION:$ACCOUNT_ID:security-group/$SG_ID] \
    --subdirectory "/dumps" \
    --query 'LocationArn' \
    --output text \
    --region $AWS_REGION)

echo "✅ EFS Location created: $DEST_LOCATION"

# Create transfer task
TASK_ARN=$(aws datasync create-task \
    --source-location-arn $SOURCE_LOCATION \
    --destination-location-arn $DEST_LOCATION \
    --options VerifyMode=ONLY_FILES_TRANSFERRED,OverwriteMode=ALWAYS \
    --includes FilterType=SIMPLE_PATTERN,Value="*.sql" \
    --name "S3-to-EFS-SQL-Dumps" \
    --query 'TaskArn' \
    --output text \
    --region $AWS_REGION)

echo "✅ DataSync Task created: $TASK_ARN"

# Start the transfer
EXECUTION_ARN=$(aws datasync start-task-execution \
    --task-arn $TASK_ARN \
    --query 'TaskExecutionArn' \
    --output text \
    --region $AWS_REGION)

echo "🚀 Transfer started: $EXECUTION_ARN"
echo "📁 Transferring from: s3://dsdemo-proxy-sqldump/proxy_complete_dump.sql"
echo "📁 Transferring to: EFS $EFS_ID/dumps/"

# Monitor progress with better feedback
echo "⏳ Monitoring transfer progress..."
while true; do
    STATUS=$(aws datasync describe-task-execution \
        --task-execution-arn $EXECUTION_ARN \
        --query 'Status' \
        --output text \
        --region $AWS_REGION)
    
    echo "Status: $STATUS"
    
    if [[ "$STATUS" == "SUCCESS" ]]; then
        echo "✅ Transfer completed successfully!"
        break
    elif [[ "$STATUS" == "ERROR" ]]; then
        echo "❌ Transfer failed!"
        aws datasync describe-task-execution \
            --task-execution-arn $EXECUTION_ARN \
            --region $AWS_REGION
        break
    fi
    
    sleep 10
done

# Get transfer statistics
aws datasync describe-task-execution \
    --task-execution-arn $EXECUTION_ARN \
    --query '{Status:Status,FilesTransferred:Result.FilesTransferred,BytesTransferred:Result.BytesTransferred,ErrorCode:Result.ErrorCode}' \
    --region $AWS_REGION
```

### Option E: Temporary EC2 with Auto-Termination

If you want minimal EC2 management, create a "disposable" instance that auto-terminates:

```bash
# Create user data script for auto-upload and termination
cat > upload-script.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y amazon-efs-utils

# Mount EFS
mkdir -p /mnt/efs
mount -t efs fs-07c9b65956846dd51:/ /mnt/efs
mkdir -p /mnt/efs/dumps

# Transfer from S3 to EFS
aws s3 sync s3://your-bucket-name/ /mnt/efs/dumps/ --include "*.sql"
chmod 644 /mnt/efs/dumps/*.sql

# Verify transfer
ls -lh /mnt/efs/dumps/ > /tmp/transfer-log.txt
aws s3 cp /tmp/transfer-log.txt s3://your-bucket-name/transfer-completed.log

# Auto-terminate this instance
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region us-east-1
EOF

# Launch instance with auto-termination script
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.micro \
    --subnet-id subnet-048b863399f44469a \
    --security-group-ids sg-0801976936653c8c1 \
    --iam-instance-profile Name=EC2-S3-EFS-Role \
    --user-data file://upload-script.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Auto-Upload-S3-to-EFS}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region us-east-1)

echo "🚀 Auto-upload instance launched: $INSTANCE_ID"
echo "📝 Instance will terminate automatically after upload completes"
echo "📋 Check S3 for 'transfer-completed.log' to confirm completion"
```

## Session Manager Troubleshooting 🔧

### Common Issue: "SSM Agent was unable to connect to a Systems Manager endpoint"

This error occurs when your EC2 instance can't reach AWS Systems Manager endpoints. Here are the most common causes and solutions:

#### 1. **Internet Connectivity Issues** (Most Common)

**Problem:** Instance doesn't have internet access to reach SSM endpoints.

**Solutions:**

**Option A: Add Internet Gateway Route (Public Subnet)**
```bash
# Check if your subnet has internet gateway route
aws ec2 describe-route-tables \
    --filters "Name=association.subnet-id,Values=$SUBNET_ID" \
    --query 'RouteTables[*].Routes[*].[DestinationCidrBlock,GatewayId]' \
    --region $AWS_REGION

# Should show 0.0.0.0/0 -> igw-xxxxx
```

**Option B: Add NAT Gateway Route (Private Subnet)**
```bash
# Check if your subnet has NAT gateway route
aws ec2 describe-route-tables \
    --filters "Name=association.subnet-id,Values=$SUBNET_ID" \
    --query 'RouteTables[*].Routes[*].[DestinationCidrBlock,NatGatewayId]' \
    --region $AWS_REGION

# Should show 0.0.0.0/0 -> nat-xxxxx
```

**Option C: Use VPC Endpoints (Corporate Networks)**
```bash
# Create SSM VPC endpoints for private connectivity
aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.$AWS_REGION.ssm \
    --vpc-endpoint-type Interface \
    --subnet-ids $SUBNET_ID \
    --security-group-ids $SG_ID \
    --region $AWS_REGION

aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.$AWS_REGION.ssmmessages \
    --vpc-endpoint-type Interface \
    --subnet-ids $SUBNET_ID \
    --security-group-ids $SG_ID \
    --region $AWS_REGION

aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.$AWS_REGION.ec2messages \
    --vpc-endpoint-type Interface \
    --subnet-ids $SUBNET_ID \
    --security-group-ids $SG_ID \
    --region $AWS_REGION
```

#### 2. **Security Group Issues**

**Problem:** Security group blocks outbound HTTPS traffic.

**Solution:**
```bash
# Check outbound rules
aws ec2 describe-security-groups \
    --group-ids $SG_ID \
    --query 'SecurityGroups[0].IpPermissionsEgress' \
    --region $AWS_REGION

# Should allow HTTPS (port 443) outbound to 0.0.0.0/0
# If not, add the rule:
aws ec2 authorize-security-group-egress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION
```

#### 3. **IAM Role Missing**

**Problem:** Instance doesn't have `AmazonSSMManagedInstanceCore` policy.

**Solution:**
```bash
# Verify IAM role is attached
aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
    --region $AWS_REGION

# Check role policies
aws iam list-attached-role-policies \
    --role-name EC2-S3-EFS-AccessRole

# Should include AmazonSSMManagedInstanceCore
```

#### 4. **SSM Agent Not Running**

**Problem:** SSM Agent service stopped or crashed.

**Solution:**
```bash
# Connect via SSH and check SSM agent
ssh -i your-key.pem ec2-user@$INSTANCE_IP

# On the instance:
sudo systemctl status amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent

# Check logs
sudo journalctl -u amazon-ssm-agent -f
```

#### 5. **Corporate Network Restrictions**

**Problem:** Corporate firewall blocks AWS API calls.

**Solutions:**
- Use VPC endpoints (Option C above)
- Ask network team to whitelist AWS SSM endpoints
- Use SSH as fallback connection method

### Quick Diagnosis Commands

```bash
# 1. Check if instance appears in SSM
aws ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
    --region $AWS_REGION

# 2. Check instance connectivity
aws ssm get-connection-status \
    --target $INSTANCE_ID \
    --region $AWS_REGION

# 3. Test basic connectivity from instance (via SSH)
curl -I https://ssm.$AWS_REGION.amazonaws.com
nslookup ssm.$AWS_REGION.amazonaws.com
```

### Fallback: Always Use SSH

If Session Manager consistently fails in your environment, modify the EC2 launch command to include a key pair:

```bash
# Launch with SSH key pair as fallback
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --instance-type t3.micro \
    --key-name your-existing-key-pair \
    --subnet-id $SUBNET_ID \
    --security-group-ids $SG_ID \
    --iam-instance-profile Name=EC2-S3-EFS-Profile \
    --associate-public-ip-address \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=S3-to-EFS-Transfer}]' \
    --user-data '#!/bin/bash
yum update -y
yum install -y amazon-efs-utils
mkdir -p /mnt/efs
mount -t efs fs-07c9b65956846dd51:/ /mnt/efs
mkdir -p /mnt/efs/dumps
echo "EFS mounted successfully" > /tmp/setup-complete.log' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "🚀 EC2 Instance launched with SSH access: $INSTANCE_ID"
echo "🔑 Connect via SSH: ssh -i your-key.pem ec2-user@$INSTANCE_IP"
```

### Why Session Manager Sometimes Fails

**Same AMI, Different Results:** Even with the same AMI, Session Manager can fail because:

1. **Network Configuration Differences**
   - Subnet routing tables vary
   - Some subnets have internet access, others don't
   - NAT gateways may be down or misconfigured

2. **Security Group Differences**
   - Different security groups attached
   - Outbound rules may block HTTPS traffic

3. **VPC Endpoint Availability**
   - Some subnets may have access to VPC endpoints
   - Others rely on internet gateway routing

4. **Corporate Network Policies**
   - Service Control Policies may block SSM in certain regions/accounts
   - Network ACLs may differ between subnets

**Recommendation:** Always include a key pair when launching instances in corporate environments as a reliable fallback connection method.
