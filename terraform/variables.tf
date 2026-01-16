variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Primary domain name (e.g., xn--caonpoint-m6a.com)"
  type        = string
}

variable "subdomain_odoo" {
  description = "Subdomain for Odoo (e.g., odoo)"
  type        = string
  default     = "odoo"
}

variable "instance_type" {
  description = "EC2 instance type (ARM-based t4g recommended)"
  type        = string
  default     = "t4g.small"

  validation {
    condition     = can(regex("^t4g\\.", var.instance_type))
    error_message = "Instance type should be ARM-based t4g (t4g.small, t4g.medium, etc)"
  }
}

variable "initial_desired_capacity" {
  description = "Initial desired capacity for ASG (0 = start scaled down)"
  type        = number
  default     = 0

  validation {
    condition     = var.initial_desired_capacity <= 1
    error_message = "Initial capacity should be 0 or 1"
  }
}

variable "idle_timeout_minutes" {
  description = "Minutes of idle CPU before scale-down"
  type        = number
  default     = 30

  validation {
    condition     = var.idle_timeout_minutes >= 10 && var.idle_timeout_minutes <= 120
    error_message = "Idle timeout should be between 10 and 120 minutes"
  }
}

variable "business_hours_only" {
  description = "Enable business hours scale schedule"
  type        = bool
  default     = true
}

variable "business_hours_timezone" {
  description = "Timezone for business hours (affects EventBridge schedule)"
  type        = string
  default     = "America/Guayaquil"  # Ecuador timezone
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "Database password must be at least 16 characters"
  }
}

variable "odoo_master_password" {
  description = "Odoo master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.odoo_master_password) >= 16
    error_message = "Odoo master password must be at least 16 characters"
  }
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict this in production
}

variable "backup_retention_days" {
  description = "Days to retain backups before archiving to Glacier"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 90
    error_message = "Backup retention should be between 7 and 90 days"
  }
}

variable "enable_spot_instances" {
  description = "Use spot instances for cost savings (recommended)"
  type        = bool
  default     = true
}

variable "spot_max_price" {
  description = "Maximum price for spot instances (empty = current price)"
  type        = string
  default     = ""
}
