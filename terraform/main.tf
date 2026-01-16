terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  app_name = "rental-odoo"
  tags = {
    Project     = "rental-system"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(
    local.tags,
    { Name = "${local.app_name}-vpc" }
  )
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags = merge(
    local.tags,
    { Name = "${local.app_name}-public-subnet" }
  )
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = merge(
    local.tags,
    { Name = "${local.app_name}-igw" }
  )
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }
  tags = merge(
    local.tags,
    { Name = "${local.app_name}-rt" }
  )
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "main" {
  name        = "${local.app_name}-sg"
  description = "Security group for rental-odoo app"
  vpc_id      = aws_vpc.main.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_cidr_blocks
    description = "SSH access"
  }

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # NFS for EFS
  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    self            = true
    description     = "NFS for EFS"
  }

  # Outbound all
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(
    local.tags,
    { Name = "${local.app_name}-sg" }
  )
}

# Elastic IP for EC2
resource "aws_eip" "ec2" {
  domain  = "vpc"
  depends_on = [aws_internet_gateway.main]
  tags = merge(
    local.tags,
    { Name = "${local.app_name}-eip" }
  )
}

# EFS File System
resource "aws_efs_file_system" "main" {
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"
  encrypted        = true

  tags = merge(
    local.tags,
    { Name = "${local.app_name}-efs" }
  )
}

# EFS Mount Target
resource "aws_efs_mount_target" "main" {
  file_system_id      = aws_efs_file_system.main.id
  subnet_id           = aws_subnet.public.id
  security_groups     = [aws_security_group.main.id]
}

# S3 Bucket for Backups
resource "aws_s3_bucket" "backups" {
  bucket              = "${local.app_name}-backups-${random_string.bucket_suffix.result}"
  force_destroy       = false

  tags = merge(
    local.tags,
    { Name = "${local.app_name}-backups" }
  )
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  lower   = true
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Lifecycle Policy (move to Glacier after 30 days)
resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "archive-to-glacier"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 7
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM Role for EC2 instances
resource "aws_iam_role" "ec2_role" {
  name = "${local.app_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

# IAM Policy for S3 access
resource "aws_iam_role_policy" "s3_access" {
  name = "${local.app_name}-s3-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.backups.arn,
          "${aws_s3_bucket.backups.arn}/*"
        ]
      }
    ]
  })
}

# IAM Policy for CloudWatch
resource "aws_iam_role_policy" "cloudwatch_access" {
  name = "${local.app_name}-cloudwatch-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${local.app_name}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# Get latest Amazon Linux 2 ARM AMI
data "aws_ami" "amazon_linux_2_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-arm64-gp2"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Launch Template
resource "aws_launch_template" "main" {
  name_prefix   = "${local.app_name}-"
  image_id      = data.aws_ami.amazon_linux_2_arm.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.main.id]
    delete_on_termination       = true
  }

  # CloudWatch agent for monitoring
  monitoring {
    enabled = true
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    efs_id                = aws_efs_file_system.main.id
    backup_bucket         = aws_s3_bucket.backups.id
    availability_zone     = data.aws_availability_zones.available.names[0]
    domain_name           = var.domain_name
    subdomain_odoo        = var.subdomain_odoo
    db_password           = var.db_password
    odoo_master_password  = var.odoo_master_password
    environment           = var.environment
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(
      local.tags,
      { Name = "${local.app_name}-server" }
    )
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(
      local.tags,
      { Name = "${local.app_name}-volume" }
    )
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "main" {
  name                = "${local.app_name}-asg"
  vpc_zone_identifier = [aws_subnet.public.id]
  min_size            = 0
  max_size            = 1
  desired_capacity    = var.initial_desired_capacity
  health_check_type   = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  # Spot instances for cost savings
  mixed_instances_policy {
    instances_distribution {
      on_demand_percentage_above_base_capacity = 0
      spot_instance_pools                      = 2
      spot_max_price                           = ""  # Use current spot price
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.main.id
        version            = "$Latest"
      }

      override {
        instance_type = var.instance_type
      }

      override {
        instance_type = "t4g.medium"
      }
    }
  }

  # Capacity Rebalancing for spot instance interruptions
  capacity_rebalance = true

  # Instance termination policies
  termination_policies = [
    "OldestLaunchTemplate",
    "Default"
  ]

  tag {
    key                 = "Name"
    value               = "${local.app_name}-server"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = local.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_role" {
  name = "${local.app_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda Policy for ASG
resource "aws_iam_role_policy" "lambda_asg_policy" {
  name = "${local.app_name}-lambda-asg-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:DescribeAutoScalingGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda Function for ASG Scale-Up
resource "aws_lambda_function" "wakeup" {
  filename         = "lambda_function.zip"
  function_name    = "${local.app_name}-wakeup"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 30

  environment {
    variables = {
      ASG_NAME = aws_autoscaling_group.main.name
    }
  }

  source_code_hash = filebase64sha256("lambda_function.zip")
}

# Lambda Function URL for CloudFlare Worker
resource "aws_lambda_function_url" "wakeup" {
  function_name          = aws_lambda_function.wakeup.function_name
  authorization_type     = "NONE"
  cors {
    allow_origins  = ["*"]
    allow_methods  = ["POST"]
    allow_headers  = ["*"]
    expose_headers = ["*"]
    max_age        = 300
  }
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.app_name}-wakeup"
  retention_in_days = 7

  tags = local.tags
}

# EventBridge Rule for Business Hours Scale-Up
resource "aws_cloudwatch_event_rule" "scale_up" {
  name                = "${local.app_name}-scale-up"
  description         = "Scale up during business hours"
  schedule_expression = "cron(0 6 ? * MON-SAT *)"  # 6 AM UTC (adjust for timezone)
  is_enabled          = var.business_hours_only

  tags = local.tags
}

resource "aws_cloudwatch_event_target" "scale_up" {
  rule     = aws_cloudwatch_event_rule.scale_up.name
  arn      = aws_iam_role.eventbridge_role.arn
  role_arn = aws_iam_role.eventbridge_role.arn

  input = jsonencode({
    AutoScalingGroupName = aws_autoscaling_group.main.name
    DesiredCapacity      = 1
  })

  iam_role_arn = aws_iam_role.eventbridge_role.arn

  depends_on = [aws_autoscaling_group.main]
}

# EventBridge Rule for Business Hours Scale-Down
resource "aws_cloudwatch_event_rule" "scale_down" {
  name                = "${local.app_name}-scale-down"
  description         = "Scale down after business hours"
  schedule_expression = "cron(0 22 * * ? *)"  # 10 PM UTC (adjust for timezone)
  is_enabled          = var.business_hours_only

  tags = local.tags
}

resource "aws_cloudwatch_event_target" "scale_down" {
  rule     = aws_cloudwatch_event_rule.scale_down.name
  arn      = aws_iam_role.eventbridge_role.arn
  role_arn = aws_iam_role.eventbridge_role.arn

  input = jsonencode({
    AutoScalingGroupName = aws_autoscaling_group.main.name
    DesiredCapacity      = 0
  })

  iam_role_arn = aws_iam_role.eventbridge_role.arn

  depends_on = [aws_autoscaling_group.main]
}

# IAM Role for EventBridge
resource "aws_iam_role" "eventbridge_role" {
  name = "${local.app_name}-eventbridge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for EventBridge to trigger ASG
resource "aws_iam_role_policy" "eventbridge_asg_policy" {
  name = "${local.app_name}-eventbridge-asg-policy"
  role = aws_iam_role.eventbridge_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Alarm for idle timeout
resource "aws_cloudwatch_metric_alarm" "idle_timeout" {
  alarm_name          = "${local.app_name}-idle-timeout"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = var.idle_timeout_minutes * 60
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "Scale down when CPU is idle"
  alarm_actions       = []
  treat_missing_data  = "notBreaching"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  tags = local.tags
}
