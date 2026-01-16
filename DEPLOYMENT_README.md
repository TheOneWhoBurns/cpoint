# AWS Scale-to-Zero Deployment

Complete infrastructure-as-code solution for deploying the rental management system and Odoo ERP with automatic scale-to-zero cost optimization.

## What is Scale-to-Zero?

Scale-to-zero is a cost optimization strategy where infrastructure automatically scales down to zero when not in use, paying only for storage ($0.65/month idle). When a user accesses the application, it automatically scales up (2-3 minute startup time).

**Cost comparison**:
- Traditional EC2 always-on: $15-20/month
- Rental system cloud: ~$70+/month
- **Scale-to-zero hybrid**: $0.65-1.50/month ✨

## Architecture

```
CloudFlare (free DNS/CDN/Worker)
    ↓
Lambda Function (wake-up trigger on demand)
    ↓
Auto Scaling Group (min=0, max=1)
    ↓
EC2 Spot Instance (t4g.small, $0.0042/hr)
    ├─ PostgreSQL 16
    ├─ Nginx reverse proxy
    ├─ Rental System (SvelteKit)
    ├─ Odoo 17 ERP
    └─ Redis (optional)
    ↓
EFS (persistent storage, survives termination)
S3 + Glacier (daily backups)
```

## What's Included

- **Complete Terraform infrastructure** (IaC): VPC, EC2, Lambda, S3, EFS, security groups
- **CloudFlare Worker**: Automatic wake-up detection when server is down
- **EC2 Bootstrap script**: Full application stack auto-installation
- **Lambda function**: Triggers ASG scale-up on demand
- **Business hours automation**: Optional EventBridge rules for scheduled scaling
- **Automated backups**: Daily PostgreSQL + Odoo filestore backup to S3/Glacier
- **Documentation**: Comprehensive guides and checklists

## Quick Start (5 minutes)

### 1. Prerequisites

```bash
# Verify you have these installed
aws --version        # AWS CLI
terraform version    # Terraform >= 1.0
node --version       # Node.js 18+
jq --version         # JSON processor
```

Configure AWS credentials:
```bash
aws configure  # Enter your AWS access key and secret
```

### 2. Configure and Deploy

```bash
cd terraform

# Copy and edit configuration
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Set domain, passwords, etc.

# Validate environment
chmod +x setup-validate.sh
./setup-validate.sh

# Package Lambda function
chmod +x package-lambda.sh
./package-lambda.sh

# Deploy infrastructure
terraform init
terraform plan
terraform apply  # Takes ~5 minutes
```

### 3. Deploy CloudFlare Worker

```bash
cd ../cloudflare

# Update worker configuration with Lambda URL (from Terraform outputs)
nano worker.js  # Update CONFIG.WAKEUP_URL

# Deploy worker
npm install -g wrangler
wrangler login
nano wrangler.toml  # Add your CloudFlare Account ID
wrangler deploy
```

### 4. Configure DNS and Boot

```bash
# Update Nameservers (Namecheap → CloudFlare) OR Update Route 53 A records
# Both point to Elastic IP from Terraform outputs

# Scale up EC2 for first boot
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name rental-odoo-asg \
  --desired-capacity 1

# Wait 5 minutes for instance to boot and initialize

# Access applications
# https://xn--caonpoint-m6a.com       (Rental System)
# https://odoo.xn--caonpoint-m6a.com  (Odoo ERP)
```

## Documentation

**Get started**:
- [`DEPLOYMENT_AWS_SCALE_ZERO.md`](./DEPLOYMENT_AWS_SCALE_ZERO.md) - Complete step-by-step guide (20 pages)
- [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) - Quick checklist for deployment phases
- [`terraform/README.md`](./terraform/README.md) - Terraform configuration details

**Implementation details**:
- [`terraform/main.tf`](./terraform/main.tf) - Core AWS infrastructure
- [`terraform/variables.tf`](./terraform/variables.tf) - Configuration inputs
- [`terraform/outputs.tf`](./terraform/outputs.tf) - Important output values
- [`terraform/user-data.sh`](./terraform/user-data.sh) - EC2 initialization script
- [`terraform/lambda_function.py`](./terraform/lambda_function.py) - Lambda wake-up function
- [`cloudflare/worker.js`](./cloudflare/worker.js) - CloudFlare Worker code
- [`cloudflare/wrangler.toml`](./cloudflare/wrangler.toml) - Worker configuration

## Key Features

### Cost Optimization
- ✨ Scale-to-zero: $0 per hour when idle
- 💰 Spot instances: 60-70% cheaper than on-demand
- 🏪 ARM Graviton: Cheaper and more efficient than x86
- 🗃️ Glacier backups: Reduced cost for archived backups

### Reliability
- 🔄 Automatic scale-up when traffic detected
- 💾 EFS persistent storage survives instance termination
- 📦 Daily automated backups to S3
- ⚡ Health checks and auto-recovery

### Automation
- 🤖 CloudFlare Worker detects downtime automatically
- ⏰ Optional business hours scaling (schedule-based)
- 🔗 Lambda triggers ASG without manual intervention
- 📊 CloudWatch monitoring and logs

### Developer Friendly
- 🔧 Complete Terraform IaC (reproducible)
- 📝 Comprehensive documentation
- ✅ Pre-built validation scripts
- 🐧 ARM-based Amazon Linux 2 (free tier compatible)

## Cost Breakdown

| Scenario | Monthly Cost | When to Use |
|----------|-------------|-----------|
| **Idle (0/1 running)** | $0.65 | Off-hours, testing |
| **8hrs/day, 20 days** | $1.50 | Business hours |
| **24/7 always-on** | $32+ | High traffic |

**Savings vs alternatives**:
- vs always-on EC2: **97% savings**
- vs Odoo.sh: **98% savings**
- vs traditional hosting: **95% savings**

## Deployment Phases

1. **Phase 1: Terraform** (30 min) - Deploy AWS infrastructure
2. **Phase 2: CloudFlare** (15 min) - Deploy Worker for auto wake-up
3. **Phase 3: DNS** (24 hrs) - Configure domain nameservers
4. **Phase 4: First Boot** (10 min) - Scale up EC2 instance
5. **Phase 5: Applications** (15 min) - Initialize Rental App + Odoo
6. **Phase 6: SSL** (5 min) - Verify HTTPS certificates
7. **Phase 7: Test** (10 min) - Test scale-to-zero functionality

**Total active time**: ~2 hours (24-hour DNS wait included)

## Troubleshooting

### Instance won't scale up
```bash
# Check ASG status
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names rental-odoo-asg

# Check Lambda logs
aws logs tail /aws/lambda/rental-odoo-wakeup --follow
```

### Domain not resolving
- Verify CloudFlare/Route 53 DNS records point to Elastic IP
- Wait for DNS propagation (up to 24 hours)
- Check: `nslookup xn--caonpoint-m6a.com`

### Applications won't start
SSH to instance and check services:
```bash
ssh -i your-key.pem ec2-user@<ELASTIC_IP>
sudo systemctl status postgresql-16
sudo systemctl status rental-app
sudo journalctl -u rental-app -f
```

See [`DEPLOYMENT_AWS_SCALE_ZERO.md`](./DEPLOYMENT_AWS_SCALE_ZERO.md) for detailed troubleshooting.

## Architecture Decisions

### Why Terraform?
- Infrastructure as Code (version control, reproducible)
- No manual clicking AWS console
- Easy to modify and redeploy
- Consistent across environments

### Why EC2 instead of Lambda?
- Lambda has 15-minute timeout (apps need longer to initialize)
- Better for long-running services (PostgreSQL, Nginx, Odoo)
- More cost-effective than Lambda for persistent workloads

### Why CloudFlare Worker?
- Free tier sufficient for this use case
- Instant wake-up detection
- No infrastructure cost (uses CloudFlare's network)
- Can add caching/analytics later

### Why EFS over EBS?
- Survives instance termination
- Can attach to multiple instances (future HA)
- Better for databases (lower latency, more reliable)
- Data persists indefinitely

### Why Spot Instances?
- 60-70% cheaper than on-demand
- Auto-recovery if interrupted (ASG handles replacement)
- Acceptable for non-production or off-peak usage
- Can disable if you need guaranteed capacity

## Future Enhancements

- [ ] Multi-AZ high availability (multiple instances + load balancer)
- [ ] RDS for PostgreSQL (managed database service)
- [ ] ElastiCache for Redis (caching layer)
- [ ] CloudFront CDN (global content delivery)
- [ ] Odoo cloud sync (Odoo.sh integration)
- [ ] Monitoring dashboard (CloudWatch Dashboards)
- [ ] Auto-scaling based on CPU (scale up to 2-3 instances if traffic spikes)
- [ ] VPN for secure admin access
- [ ] Disaster recovery automation (RTO/RPO targets)

## Security Considerations

- ✅ **SSH restricted** to your IP(s) only (configure in terraform.tfvars)
- ✅ **SSL/TLS enforced** (Let's Encrypt via Certbot)
- ✅ **Database password** stored securely in Terraform/AWS Secrets Manager
- ✅ **S3 backups** encrypted and lifecycle-managed
- ✅ **EFS encrypted** at rest
- ⚠️ **TODO**: Add Web Application Firewall (WAF)
- ⚠️ **TODO**: Configure CloudFlare security rules
- ⚠️ **TODO**: Set up VPC security groups more restrictively

## License

This deployment configuration is part of the cpoint rental system project.

## Support & Next Steps

1. Read [`DEPLOYMENT_AWS_SCALE_ZERO.md`](./DEPLOYMENT_AWS_SCALE_ZERO.md) for detailed instructions
2. Follow [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) step-by-step
3. Keep [`terraform/README.md`](./terraform/README.md) open while deploying
4. Check troubleshooting sections if issues arise

**Questions?** See documentation links above or check AWS/CloudFlare official docs.

---

**Deployed by**: AWS Scale-to-Zero Terraform
**Last updated**: January 2026
**Cost estimate**: $0.65-1.50/month (idle-8hrs/day)
