# AWS Scale-to-Zero Deployment Guide

Scale-to-Zero infrastructure for rental management system and Odoo ERP on budget. ~$0.65/month idle, ~$1.50/month at 8hrs/day.

## Prerequisites

- AWS account with credentials configured (`aws configure`)
- Terraform >= 1.0 installed (`terraform version`)
- CloudFlare account (free tier sufficient)
- Domain: xn--caonpoint-m6a.com registered on Namecheap
- Route 53 hosted zone already created: `Z07775881FT8NI2J8HAG8`
- Node.js 18+ for CloudFlare Worker (`node --version`)

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ CloudFlare (CDN + Worker)                           │
│ ├─ Free DNS, SSL, auto-scaling detection             │
│ └─ Worker routes to origin server or triggers Lambda │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ Lambda Function   │
         │ (Wake-up trigger) │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────────────────┐
         │ Auto Scaling Group (min=0)    │
         │ ├─ EC2 Spot t4g.small         │
         │ ├─ Elastic IP (static DNS)    │
         │ └─ Auto-scales 0→1 on demand  │
         └─────────┬─────────────────────┘
                   │
         ┌─────────▼──────────────────────────────┐
         │ EC2 Instance (Graviton ARM)            │
         ├─ PostgreSQL 16                          │
         ├─ Nginx (reverse proxy)                  │
         ├─ Rental System (SvelteKit)              │
         ├─ Odoo 17 ERP                           │
         ├─ Redis (optional, for Odoo)            │
         └─────────┬──────────────────────────────┘
                   │
         ┌─────────▼──────────────────────────────┐
         │ EFS (Persistent Storage)               │
         ├─ PostgreSQL data                        │
         ├─ Odoo filestore                         │
         └─ Survives instance termination         │
         └─────────────────────────────────────────┘
```

## Step 1: Configure Terraform

1. **Copy variables template:**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars:**
   ```bash
   nano terraform.tfvars
   ```
   - Set strong passwords (16+ chars)
   - Verify domain name: `xn--caonpoint-m6a.com`
   - Set SSH CIDR to your IP for security: `["YOUR_IP/32"]`
   - Keep instance_type as `t4g.small` (most cost-effective)

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

## Step 2: Package Lambda Function

```bash
chmod +x package-lambda.sh
./package-lambda.sh
```

This creates `lambda_function.zip` needed by Terraform.

## Step 3: Deploy Infrastructure

```bash
terraform plan
```

Review the output. Should create:
- 1 VPC with public subnet
- 1 Security Group
- 1 EFS volume
- 1 S3 bucket
- 1 Auto Scaling Group (min=0, max=1)
- 1 Lambda function
- 1 Elastic IP

```bash
terraform apply
```

Save the outputs:
- **Elastic IP**: Use for DNS A record
- **Lambda Function URL**: Copy to CloudFlare Worker CONFIG.WAKEUP_URL
- **ASG Name**: For manual scaling commands

## Step 4: Configure CloudFlare

### Option A: CloudFlare as Primary DNS (Recommended)

1. **Add domain to CloudFlare:**
   - Log in to CloudFlare dashboard
   - Add site → Enter `xn--caonpoint-m6a.com`
   - Select Free plan
   - Copy CloudFlare nameservers

2. **Update Namecheap:**
   - Log in to Namecheap
   - Domain list → xn--caonpoint-m6a.com → Manage
   - Nameservers → Custom DNS
   - Paste CloudFlare nameservers
   - Wait 24 hours for propagation

3. **Create DNS records in CloudFlare:**
   - Type: A, Name: @, Value: [Elastic IP], Proxied: Yes (orange cloud)
   - Type: A, Name: odoo, Value: [Elastic IP], Proxied: Yes (orange cloud)
   - Type: A, Name: origin, Value: [Elastic IP], Proxied: No (grey cloud)

### Option B: Route 53 (if using CloudFlare as proxy only)

Already configured. Just use the Elastic IP with Route 53 records.

## Step 5: Deploy CloudFlare Worker

1. **Update worker configuration:**
   ```bash
   cd cloudflare
   nano worker.js
   ```
   Replace `https://YOUR_LAMBDA_URL_HERE.lambda-url.us-east-1.on.aws/` with your Lambda Function URL from Terraform outputs.

2. **Install Wrangler:**
   ```bash
   npm install -g wrangler
   ```

3. **Authenticate with CloudFlare:**
   ```bash
   wrangler login
   ```
   - Opens browser for authentication
   - Confirm and return to terminal

4. **Update wrangler.toml with your account:**
   ```bash
   nano wrangler.toml
   ```
   - Find your CloudFlare Account ID: CloudFlare Dashboard → Account → Account ID
   - Paste it in `account_id = "..."`

5. **Deploy worker:**
   ```bash
   wrangler deploy
   ```

6. **Add routes in CloudFlare Dashboard:**
   - Workers & Pages → your-worker → Triggers → Routes → Add Route
   - Route 1: `xn--caonpoint-m6a.com/*`
   - Route 2: `odoo.xn--caonpoint-m6a.com/*`
   - Zone: xn--caonpoint-m6a.com

## Step 6: Manual First Boot

1. **Scale up the ASG:**
   ```bash
   aws autoscaling set-desired-capacity \
     --auto-scaling-group-name rental-odoo-asg \
     --desired-capacity 1
   ```

2. **Wait 5 minutes** for EC2 to boot and services to start.

3. **Get instance IP (optional, for SSH):**
   ```bash
   aws ec2 describe-instances \
     --filters "Name=tag:Name,Values=rental-odoo-server" \
     --query 'Reservations[].Instances[].PublicIpAddress' \
     --output text
   ```

4. **SSH to instance (optional troubleshooting):**
   ```bash
   ssh -i your-key.pem ec2-user@<ELASTIC_IP>
   ```
   Check services:
   ```bash
   sudo systemctl status postgresql-16
   sudo systemctl status rental-app
   sudo systemctl status nginx
   sudo journalctl -u rental-app -f  # View logs
   ```

## Step 7: Initialize Applications

Once instance is running:

1. **Access rental system:** https://xn--caonpoint-m6a.com
   - Should show the rental management interface
   - Database migrations auto-run on first boot

2. **Access Odoo:** https://odoo.xn--caonpoint-m6a.com
   - Choose language
   - Create database
   - Set database name (e.g., "odoo_prod")
   - Set email and password
   - Odoo will initialize database automatically

## Step 8: Configure SSL Certificates

SSL certificates are requested automatically during first boot via Let's Encrypt/Certbot.

If certificates failed to obtain (domain not resolving yet):

```bash
# SSH to instance
ssh -i your-key.pem ec2-user@<ELASTIC_IP>

# Request certificates manually
sudo certbot certonly --nginx \
  -d xn--caonpoint-m6a.com \
  -d odoo.xn--caonpoint-m6a.com \
  -m your-email@example.com

# Reload nginx
sudo systemctl reload nginx
```

## Step 9: Test Scale-to-Zero

1. **Scale down:**
   ```bash
   aws autoscaling set-desired-capacity \
     --auto-scaling-group-name rental-odoo-asg \
     --desired-capacity 0
   ```

2. **Wait 2 minutes** for instance to shut down.

3. **Visit domain:** https://xn--caonpoint-m6a.com
   - Should show CloudFlare Worker wake-up message
   - Message says "Server Waking Up" with countdown

4. **Wait 2-3 minutes** for Lambda to trigger ASG, instance to boot, and services to start.

5. **Refresh page** - should be back online.

## Step 10: Configure Business Hours Scaling (Optional)

EventBridge rules are created by Terraform but disabled if `business_hours_only = false`.

To enable automatic scaling:

1. Update `terraform.tfvars`:
   ```
   business_hours_only = true
   ```

2. Adjust cron schedules in `terraform/main.tf` if needed:
   ```
   scale_up: cron(0 6 ? * MON-SAT *)  # 6 AM UTC
   scale_down: cron(0 22 * * ? *)    # 10 PM UTC
   ```

3. Apply changes:
   ```bash
   terraform apply
   ```

## Useful Commands

### Manual Scaling
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
```

### SSH Access
```bash
# Get instance IP
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=rental-odoo-server" \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text

# Connect
ssh -i your-key.pem ec2-user@<IP>
```

### View Logs
```bash
# On instance, via SSH:
sudo journalctl -u rental-app -f    # Rental app logs
sudo journalctl -u odoo -f          # Odoo logs
sudo journalctl -u postgresql-16 -f # Database logs
sudo journalctl -u nginx -f         # Reverse proxy logs
sudo tail -f /var/log/user-data.log # Startup logs
```

### Manage Backups
```bash
# List backups
aws s3 ls s3://rental-odoo-backups-<suffix>/daily/

# Download backup
aws s3 cp s3://rental-odoo-backups-<suffix>/daily/rental_manager_20240115_030000.sql.gz ./

# Restore backup (on instance)
gunzip < backup.sql.gz | psql -U rental rental_manager
```

### Manual Backup
```bash
# SSH to instance
ssh -i your-key.pem ec2-user@<IP>

# Run backup script
sudo /usr/local/bin/backup.sh
```

## Verification Checklist

- [ ] Terraform apply completed successfully
- [ ] Elastic IP obtained and saved
- [ ] Lambda Function URL obtained and saved
- [ ] CloudFlare DNS records created
- [ ] CloudFlare Worker deployed and routes attached
- [ ] ASG manually scaled up (desired capacity = 1)
- [ ] Instance appears in EC2 console
- [ ] Instance security group allows HTTP/HTTPS
- [ ] EFS mounted at `/mnt/efs` on instance
- [ ] PostgreSQL running with both databases
- [ ] Rental app accessible at https://xn--caonpoint-m6a.com
- [ ] Rental app responds to /health endpoint
- [ ] Odoo accessible at https://odoo.xn--caonpoint-m6a.com
- [ ] Odoo database created and configured
- [ ] SSL certificates valid (no browser warnings)
- [ ] Manual scale-down works (ASG desired capacity = 0)
- [ ] CloudFlare Worker shows wake message when scaled down
- [ ] Lambda wake-up triggers ASG after scale-down
- [ ] Instance boots and apps come back online in 2-3 minutes
- [ ] Data persists across instance terminations (check EFS)
- [ ] Backups creating in S3 (check daily backup logs)
- [ ] CloudWatch metrics visible for monitoring

## Cost Breakdown

### Idle (0/1 instance running)
- EFS: 1GB × $0.30 = $0.30/month
- S3 Standard: 2GB × $0.023 = $0.05/month
- S3 Glacier: 10GB × $0.004 = $0.04/month
- Route 53: $0.50/month (if using)
- **Total: ~$0.65/month**

### Business Hours (8hr/day, 20 days/month)
- EC2 Spot t4g.small: 160 hours × $0.0042 = $0.67/month
- EFS: $0.10/month
- S3/Data transfer: $0.10/month
- Idle costs: $0.65/month
- **Total: ~$1.52/month**

### Always On (24/7/365)
- EC2 Spot t4g.small: 8,760 hours × $0.0042 = $36.79/month
- EFS: $1.50/month
- S3/Data transfer: $2.00/month
- Route 53: $0.50/month
- **Total: ~$40.79/month**

## Troubleshooting

### Instance doesn't boot
```bash
# Check CloudFormation/ASG events
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name rental-odoo-asg

# Check system logs
aws ec2 get-console-output --instance-id i-xxxxxxx
```

### Services not starting
SSH to instance and check:
```bash
sudo systemctl status postgresql-16
sudo systemctl status rental-app
sudo systemctl status odoo
sudo systemctl status nginx

# View service logs
sudo journalctl -u <service-name> -f
```

### Domain not resolving
- Verify CloudFlare DNS records are created
- Check that nameservers are updated in Namecheap
- Wait up to 24 hours for DNS propagation
- Verify Elastic IP matches A record

### CloudFlare Worker not triggering Lambda
1. Check Lambda Function URL is correct in worker.js
2. Verify Lambda execution role has permission to scale ASG
3. Check CloudFlare Worker is deployed and routes are attached
4. Test manually: `curl https://xn--caonpoint-m6a.com` (should trigger wake-up if scaled down)

### SSL certificate errors
```bash
# On instance, check certificate
sudo certbot certificates

# Renew manually if needed
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### Database connection issues
```bash
# On instance, test PostgreSQL
psql -U rental -d rental_manager -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql-16

# View PostgreSQL logs
sudo journalctl -u postgresql-16 -f
```

## Maintenance

### Regular Tasks
- **Weekly**: Spot price check (`aws ec2 describe-spot-price-history`)
- **Monthly**: Review AWS Cost Explorer for unexpected charges
- **Monthly**: Test backup restore process
- **Quarterly**: Review and update security group rules
- **Quarterly**: Rotate database password

### Scaling Adjustments
```bash
# If you need more resources, scale up instance type:
# Edit terraform.tfvars: instance_type = "t4g.medium"
# Then apply
terraform apply

# If you need second instance for HA:
# Edit terraform.tfvars: max_size = 2
# But this requires load balancer configuration (not in this plan)
```

### Decommission (Delete Infrastructure)
```bash
# WARNING: This deletes all resources
terraform destroy

# If that fails, delete manually:
aws autoscaling delete-auto-scaling-group \
  --auto-scaling-group-name rental-odoo-asg \
  --force-delete
```

## Next Steps

1. ✅ Deployment complete
2. Configure backups and test restore process
3. Set up monitoring and alerts in CloudWatch
4. Configure Odoo modules for accounting/inventory
5. Integrate Odoo with rental system via API/webhooks
6. Consider adding CloudFlare Analytics for traffic monitoring
7. Plan for scale-up if business grows (additional instances, RDS, etc.)

## Support

- Terraform: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS: https://docs.aws.amazon.com
- CloudFlare Workers: https://developers.cloudflare.com/workers
- Odoo: https://www.odoo.com/documentation
- SvelteKit: https://kit.svelte.dev/docs
