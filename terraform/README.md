# Terraform Configuration for Scale-to-Zero AWS Deployment

This directory contains Terraform configuration for deploying the rental system + Odoo ERP with automatic scale-to-zero functionality.

## Files

- **main.tf** - Core AWS infrastructure (VPC, EC2, EFS, S3, Lambda, etc.)
- **variables.tf** - Input variables and validation
- **outputs.tf** - Output values (IP addresses, bucket names, etc.)
- **terraform.tfvars.example** - Template for your configuration (copy to terraform.tfvars)
- **user-data.sh** - EC2 initialization script
- **lambda_function.py** - Lambda function code for ASG scale-up
- **package-lambda.sh** - Script to package Lambda function into zip

## Quick Start

### 1. Initialize

```bash
# Copy template and configure your values
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Edit domain, passwords, etc.

# Initialize Terraform
terraform init
```

### 2. Package Lambda

```bash
chmod +x package-lambda.sh
./package-lambda.sh
```

This creates `lambda_function.zip` needed for the Lambda function resource.

### 3. Deploy

```bash
terraform plan  # Review changes
terraform apply  # Deploy infrastructure
```

Save the outputs! You'll need:
- **Elastic IP**: For DNS A records
- **Lambda Function URL**: For CloudFlare Worker CONFIG.WAKEUP_URL
- **ASG Name**: For manual scaling commands

## Configuration

### terraform.tfvars

Key variables to set:

```hcl
domain_name              = "xn--caonpoint-m6a.com"
subdomain_odoo           = "odoo"
instance_type            = "t4g.small"  # ARM Graviton processor
db_password              = "YourSecurePassword123!"
odoo_master_password     = "OdooAdminPass456!"
business_hours_only      = true
initial_desired_capacity = 0  # Start scaled down
```

### Cost Optimization

- **instance_type**: `t4g.small` = $0.0042/hr (cheapest), `t4g.medium` = $0.0084/hr
- **enable_spot_instances**: `true` = 60-70% cheaper than on-demand
- **initial_desired_capacity**: `0` = pay zero while idle, `1` = always-on

## Infrastructure Resources

### Compute
- **Auto Scaling Group**: min=0, max=1 (scales based on demand)
- **EC2 Spot Instance**: t4g.small (ARM-based, cost-efficient)
- **Elastic IP**: Static IP for DNS
- **Security Group**: Allows HTTP/HTTPS/SSH

### Storage
- **EFS**: Persistent storage for PostgreSQL and Odoo filestore
- **S3**: Backup bucket with lifecycle policy (Standard → Glacier)

### Networking
- **VPC**: Custom VPC with public subnet
- **Internet Gateway**: For public access
- **Route Table**: Routes traffic to IGW

### Monitoring & Automation
- **Lambda**: Triggers ASG scale-up when CloudFlare detects downtime
- **EventBridge**: Schedules scale-up/down during business hours
- **CloudWatch**: Monitors CPU, disk, memory; logs for troubleshooting

## Manual Commands

```bash
# Scale up
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name rental-odoo-asg \
  --desired-capacity 1

# Scale down
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name rental-odoo-asg \
  --desired-capacity 0

# Check status
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names rental-odoo-asg

# Get instance IP
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=rental-odoo-server" \
  --query 'Reservations[].Instances[].PublicIpAddress'
```

## Troubleshooting

### Lambda function fails to deploy
- Make sure `lambda_function.zip` exists
- Run `./package-lambda.sh` again
- Check Python 3.11 is available

### Terraform plan fails
- Ensure AWS credentials are configured: `aws configure`
- Check AWS permissions (need IAM to create VPCs, EC2, Lambda, etc.)
- Verify region is correct: `aws_region = "us-east-1"`

### EventBridge not scaling
- EventBridge needs proper IAM permissions for SetDesiredCapacity
- Check EventBridge rule is enabled: `business_hours_only = true`
- Verify cron expressions for your timezone

## Terraform State

Terraform stores infrastructure state in `terraform.tfstate`. This file:
- **Contains sensitive data** (passwords, URLs)
- **Should be backed up** (or use remote state in S3)
- **Don't commit to git** (.gitignore is recommended)

For production, configure remote state:

```bash
# Create S3 bucket for state
aws s3 mb s3://terraform-state-rental-odoo

# Create DynamoDB table for locks
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

Then add to Terraform:

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-rental-odoo"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## Costs

Estimated monthly costs:

| Scenario | Compute | Storage | Total |
|----------|---------|---------|-------|
| **Idle (scaled to 0)** | $0 | $0.65 | **$0.65** |
| **8hr/day, 20 days** | $0.67 | $0.85 | **$1.52** |
| **24/7 always-on** | $30 | $2 | **$32+** |

Spot instances save 60-70% vs on-demand.

## Scaling the Deployment

### Go larger
```hcl
instance_type = "t4g.medium"  # More CPU/memory
max_size = 2                   # Multiple instances (requires load balancer)
```

### High availability
```hcl
max_size = 2
# Add: AWS Load Balancer, Multi-AZ setup
```

### Always-on
```hcl
initial_desired_capacity = 1
# Set: EventBridge to maintain capacity, no scale-down
```

## Documentation

- Full deployment guide: `../DEPLOYMENT_AWS_SCALE_ZERO.md`
- AWS Terraform provider: https://registry.terraform.io/providers/hashicorp/aws/latest
- Terraform docs: https://www.terraform.io/docs
