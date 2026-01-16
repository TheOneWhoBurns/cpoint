# Scale-to-Zero Deployment Checklist

Quick reference for deploying rental system + Odoo ERP to AWS with scale-to-zero automation.

## Pre-Deployment (Do Once)

- [ ] **AWS Account Setup**
  - [ ] AWS account created and verified
  - [ ] IAM user created with programmatic access
  - [ ] AWS CLI configured locally: `aws configure`
  - [ ] AWS credentials have EC2, VPC, Lambda, S3, AutoScaling, EFS, Route53 permissions

- [ ] **Domain Setup**
  - [ ] Domain registered: xn--caonpoint-m6a.com (Namecheap)
  - [ ] Route 53 hosted zone created: Z07775881FT8NI2J8HAG8
  - [ ] Nameservers noted for later DNS configuration

- [ ] **CloudFlare Account**
  - [ ] CloudFlare account created (free tier sufficient)
  - [ ] Account ID obtained (Dashboard → Account)

- [ ] **Local Tools**
  - [ ] Terraform >= 1.0 installed: `terraform version`
  - [ ] AWS CLI installed: `aws --version`
  - [ ] Node.js 18+ installed: `node --version`
  - [ ] jq installed: `jq --version` (for JSON parsing)

- [ ] **Repository**
  - [ ] Clone/update repo with this code: terraform/, cloudflare/ directories
  - [ ] SSH key pair for EC2 access created (in AWS)

## Phase 1: Terraform Infrastructure (30 minutes)

- [ ] **Configure Terraform**
  - [ ] `cd terraform`
  - [ ] `cp terraform.tfvars.example terraform.tfvars`
  - [ ] Edit terraform.tfvars:
    - [ ] Set `domain_name = "xn--caonpoint-m6a.com"`
    - [ ] Set `subdomain_odoo = "odoo"`
    - [ ] Generate strong password for `db_password` (16+ chars)
    - [ ] Generate strong password for `odoo_master_password` (16+ chars)
    - [ ] Set SSH access CIDR: `ssh_cidr_blocks = ["YOUR_IP/32"]`
    - [ ] Keep `instance_type = "t4g.small"` for cost efficiency
    - [ ] Keep `initial_desired_capacity = 0` (scale-to-zero)

- [ ] **Validate Environment**
  - [ ] `chmod +x setup-validate.sh`
  - [ ] `./setup-validate.sh`
  - [ ] All checks pass (green ✓)

- [ ] **Package Lambda Function**
  - [ ] `chmod +x package-lambda.sh`
  - [ ] `./package-lambda.sh`
  - [ ] `lambda_function.zip` created

- [ ] **Deploy Infrastructure**
  - [ ] `terraform init` (initialize working directory)
  - [ ] `terraform plan` (review changes)
  - [ ] `terraform apply` (deploy infrastructure)
  - [ ] Wait 5 minutes for all resources to be created
  - [ ] Copy outputs:
    - `elastic_ip` → Save for DNS A record
    - `lambda_function_url` → Copy to CloudFlare worker
    - `asg_name` → Save for manual scaling commands
    - `s3_backup_bucket` → For backup references

## Phase 2: CloudFlare Worker (15 minutes)

- [ ] **Update Worker Configuration**
  - [ ] `cd ../cloudflare`
  - [ ] `nano worker.js`
  - [ ] Replace `CONFIG.WAKEUP_URL` with Lambda Function URL from Terraform outputs
  - [ ] Save (Ctrl+X → Y)

- [ ] **Deploy CloudFlare Worker**
  - [ ] `npm install -g wrangler` (if not already installed)
  - [ ] `wrangler login` (authenticate with CloudFlare)
  - [ ] Find CloudFlare Account ID:
    - [ ] Go to CloudFlare Dashboard → Account (top right)
    - [ ] Copy Account ID
  - [ ] `nano wrangler.toml`
  - [ ] Update `account_id = "YOUR_ACCOUNT_ID"`
  - [ ] Save
  - [ ] `wrangler deploy`
  - [ ] Note the deployed Worker URL

- [ ] **Configure CloudFlare Routes**
  - [ ] Go to CloudFlare Dashboard
  - [ ] Workers & Pages → Rental System Worker
  - [ ] Routes → Add routes:
    - [ ] Route: `xn--caonpoint-m6a.com/*`
    - [ ] Route: `odoo.xn--caonpoint-m6a.com/*`
    - [ ] Zone: xn--caonpoint-m6a.com

## Phase 3: DNS Configuration (24 hours)

### Option A: CloudFlare as Primary DNS

- [ ] **Update Namecheap**
  - [ ] Namecheap → Login
  - [ ] Domain List → xn--caonpoint-m6a.com → Manage
  - [ ] Nameservers → Custom DNS
  - [ ] Add CloudFlare nameservers (provided by CloudFlare)
  - [ ] Save and wait 24 hours for propagation

- [ ] **Create CloudFlare DNS Records**
  - [ ] CloudFlare Dashboard → DNS → Records
  - [ ] Add A record:
    - Name: @ (root)
    - Type: A
    - Content: [Elastic IP from Terraform]
    - Proxied: Yes (orange cloud)
  - [ ] Add A record:
    - Name: odoo
    - Type: A
    - Content: [Elastic IP from Terraform]
    - Proxied: Yes (orange cloud)
  - [ ] Add A record (origin):
    - Name: origin
    - Type: A
    - Content: [Elastic IP from Terraform]
    - Proxied: No (grey cloud - DNS only)

### Option B: Keep Using Route 53

- [ ] **Update Route 53 Records**
  - [ ] AWS Console → Route 53 → Hosted Zones → Z07775881FT8NI2J8HAG8
  - [ ] Update A record for xn--caonpoint-m6a.com:
    - [ ] Value: [Elastic IP from Terraform]
  - [ ] Update A record for odoo.xn--caonpoint-m6a.com:
    - [ ] Value: [Elastic IP from Terraform]
  - [ ] Create new A record for origin.xn--caonpoint-m6a.com:
    - [ ] Value: [Elastic IP from Terraform]

## Phase 4: Manual First Boot (10 minutes)

- [ ] **Scale Up EC2 Instance**
  - [ ] `cd ../terraform` (back to terraform directory)
  - [ ] `aws autoscaling set-desired-capacity --auto-scaling-group-name rental-odoo-asg --desired-capacity 1`
  - [ ] Monitor in AWS Console:
    - [ ] EC2 → Instances → instance launching
    - [ ] Wait ~5 minutes for instance to boot

- [ ] **Verify Instance Boot** (SSH optional, for troubleshooting)
  - [ ] `aws ec2 describe-instances --filters 'Name=tag:Name,Values=rental-odoo-server' --query 'Reservations[].Instances[].PublicIpAddress' --output text`
  - [ ] SSH to instance: `ssh -i your-key.pem ec2-user@[IP]`
  - [ ] Check services:
    ```bash
    sudo systemctl status postgresql-16  # Database
    sudo systemctl status rental-app     # Rental app (may take 2 min)
    sudo systemctl status nginx          # Web server
    ```

## Phase 5: Application Initialization (15 minutes)

- [ ] **Wait for Services to Start**
  - [ ] Wait 5 more minutes after instance boot
  - [ ] Services auto-start and initialize databases

- [ ] **Access Rental App**
  - [ ] Browser: https://xn--caonpoint-m6a.com
  - [ ] Verify page loads (may take 1-2 minutes on first access)
  - [ ] Should see rental management interface

- [ ] **Access Odoo**
  - [ ] Browser: https://odoo.xn--caonpoint-m6a.com
  - [ ] Create database:
    - [ ] Master Password: [odoo_master_password from terraform.tfvars]
    - [ ] Database Name: odoo_prod (or your choice)
    - [ ] Email: your-email@example.com
    - [ ] Password: (your Odoo admin password)
  - [ ] Wait for database initialization (2-5 minutes)
  - [ ] Verify Odoo dashboard loads

## Phase 6: SSL Certificates (5 minutes)

- [ ] **Check SSL Status**
  - [ ] Browser: https://xn--caonpoint-m6a.com
  - [ ] Check certificate: No warnings, green lock icon
  - [ ] SSL auto-provisioned during instance boot

- [ ] **Manual Certificate Request** (if needed)
  - [ ] SSH to instance: `ssh -i your-key.pem ec2-user@[IP]`
  - [ ] Request certs manually:
    ```bash
    sudo certbot certonly --nginx \
      -d xn--caonpoint-m6a.com \
      -d odoo.xn--caonpoint-m6a.com \
      -m your-email@example.com
    ```
  - [ ] Reload Nginx: `sudo systemctl reload nginx`

## Phase 7: Test Scale-to-Zero (10 minutes)

- [ ] **Scale Down EC2**
  - [ ] `aws autoscaling set-desired-capacity --auto-scaling-group-name rental-odoo-asg --desired-capacity 0`
  - [ ] Wait 2 minutes for shutdown

- [ ] **Verify Shutdown**
  - [ ] Browser: https://xn--caonpoint-m6a.com
  - [ ] Should see CloudFlare Worker "Server Waking Up" message
  - [ ] Message shows countdown timer

- [ ] **Trigger Wake-Up**
  - [ ] Wait ~10 seconds for Lambda to trigger
  - [ ] Observe CloudFlare worker message updates (if auto-refresh enabled)
  - [ ] Wait 2-3 minutes for instance to boot and services to start

- [ ] **Verify Scale-Up Complete**
  - [ ] Refresh browser: https://xn--caonpoint-m6a.com
  - [ ] Rental app loads normally
  - [ ] Check Odoo: https://odoo.xn--caonpoint-m6a.com
  - [ ] Both applications responsive

## Phase 8: Optional Business Hours Automation

- [ ] **Enable Business Hours Schedule** (optional)
  - [ ] `cd terraform`
  - [ ] Edit `terraform.tfvars`: set `business_hours_only = true`
  - [ ] Edit `main.tf` to adjust cron schedules if needed (currently UTC):
    - Scale up: `0 6 ? * MON-SAT` (6 AM UTC)
    - Scale down: `0 22 * * ?` (10 PM UTC)
  - [ ] `terraform apply`
  - [ ] Test: Create test schedule 2 minutes in future, verify ASG scales

## Phase 9: Backup Configuration (5 minutes)

- [ ] **Verify Backups**
  - [ ] SSH to instance: `ssh -i your-key.pem ec2-user@[IP]`
  - [ ] Check backup logs:
    ```bash
    sudo tail -f /var/log/backup.log
    # Or run manually:
    sudo /usr/local/bin/backup.sh
    ```
  - [ ] Check S3 bucket:
    ```bash
    aws s3 ls s3://rental-odoo-backups-[suffix]/daily/
    ```

- [ ] **Test Backup Restore** (optional but recommended)
  - [ ] Download backup: `aws s3 cp s3://rental-odoo-backups-[suffix]/daily/rental_manager_*.sql.gz ./`
  - [ ] Verify integrity: `gunzip < backup.sql.gz | head` (should show SQL)

## Phase 10: Monitoring Setup (10 minutes)

- [ ] **CloudWatch Dashboards**
  - [ ] AWS Console → CloudWatch → Dashboards
  - [ ] Create dashboard:
    - [ ] Add metric: EC2 CPU Utilization
    - [ ] Add metric: EFS Storage
    - [ ] Add logs: /aws/ec2/rental-system
    - [ ] Add logs: /aws/ec2/odoo

- [ ] **CloudWatch Alarms** (optional)
  - [ ] High CPU: Alert if > 80%
  - [ ] Low disk: Alert if < 10% free
  - [ ] Failed health check: Alert if instance unhealthy

## Post-Deployment (Ongoing)

- [ ] **Monitor Costs**
  - [ ] Check AWS Cost Explorer monthly
  - [ ] Expected: ~$1.50/month (8 hours/day usage)

- [ ] **Regular Backups**
  - [ ] Verify daily backups running (cron job at 3 AM UTC)
  - [ ] Test restore process monthly

- [ ] **Security**
  - [ ] Restrict SSH CIDR blocks to your IP(s)
  - [ ] Rotate database passwords quarterly
  - [ ] Monitor CloudWatch logs for errors

- [ ] **Updates**
  - [ ] Check PostgreSQL security updates monthly
  - [ ] Check Odoo module updates in dashboard
  - [ ] Monitor rental app GitHub for updates

## Troubleshooting Quick Links

| Issue | Command |
|-------|---------|
| Instance won't boot | `aws autoscaling describe-scaling-activities --auto-scaling-group-name rental-odoo-asg` |
| Services won't start | SSH in, check: `sudo journalctl -u rental-app -f` |
| Domain not resolving | Check DNS propagation, verify A records in CloudFlare/Route53 |
| SSL errors | SSH in, run: `sudo certbot certificates` |
| Database connection error | SSH in, test: `psql -U rental -d rental_manager -h localhost` |
| Backups not running | SSH in, check: `crontab -l` and `/var/log/backup.log` |
| Lambda not triggering | Check Lambda logs in CloudWatch, verify CloudFlare worker URL correct |

## Estimated Timeline

- **First time deployment**: 4-6 hours (includes DNS propagation time)
- **Scale-to-zero test**: 10 minutes
- **Daily operation**: Fully automated after initial setup

## Cost Summary

- **Idle (0/1 running)**: $0.65/month
- **8 hours/day**: $1.50/month
- **Always-on**: $32+/month

Spot instances provide 60-70% savings vs on-demand.

## Support Resources

- Terraform: https://registry.terraform.io/providers/hashicorp/aws/latest
- AWS Docs: https://docs.aws.amazon.com
- CloudFlare Workers: https://developers.cloudflare.com/workers
- Odoo: https://www.odoo.com/documentation
- SvelteKit: https://kit.svelte.dev

---

**Deployment started**: ________
**Infrastructure deployed**: ________
**First boot successful**: ________
**Scale-to-zero tested**: ________
**Go-live date**: ________
