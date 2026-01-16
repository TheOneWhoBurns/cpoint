output "elastic_ip" {
  description = "Elastic IP address for EC2 instance (use for DNS A record)"
  value       = aws_eip.ec2.public_ip
}

output "lambda_function_url" {
  description = "Lambda function URL for CloudFlare Worker (copy to worker.js CONFIG.WAKEUP_URL)"
  value       = aws_lambda_function_url.wakeup.function_url
  sensitive   = false
}

output "asg_name" {
  description = "Auto Scaling Group name (for manual scale commands)"
  value       = aws_autoscaling_group.main.name
}

output "s3_backup_bucket" {
  description = "S3 bucket name for backups"
  value       = aws_s3_bucket.backups.id
}

output "efs_file_system_id" {
  description = "EFS file system ID"
  value       = aws_efs_file_system.main.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.main.id
}

output "launch_template_id" {
  description = "Launch template ID"
  value       = aws_launch_template.main.id
}

output "deployment_status" {
  description = "Status after Terraform apply"
  value = {
    status           = "Infrastructure created successfully"
    next_steps       = [
      "1. Save the Elastic IP above for DNS configuration",
      "2. Copy the Lambda Function URL to CloudFlare Worker CONFIG.WAKEUP_URL",
      "3. Deploy CloudFlare Worker",
      "4. Configure DNS records pointing to Elastic IP",
      "5. Scale up ASG: aws autoscaling set-desired-capacity --auto-scaling-group-name ${aws_autoscaling_group.main.name} --desired-capacity 1",
      "6. Wait 5 minutes for first boot",
      "7. SSH to instance and run: npm run db:push in /opt/rental-system"
    ]
  }
}

output "useful_commands" {
  description = "Useful AWS CLI commands"
  value = {
    scale_up = "aws autoscaling set-desired-capacity --auto-scaling-group-name ${aws_autoscaling_group.main.name} --desired-capacity 1"
    scale_down = "aws autoscaling set-desired-capacity --auto-scaling-group-name ${aws_autoscaling_group.main.name} --desired-capacity 0"
    get_instance_ip = "aws ec2 describe-instances --filters 'Name=tag:Name,Values=${local.app_name}-server' --query 'Reservations[].Instances[].PublicIpAddress' --output text"
    list_backups = "aws s3 ls s3://${aws_s3_bucket.backups.id}/daily/"
  }
}
