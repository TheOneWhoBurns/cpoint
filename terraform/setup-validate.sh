#!/bin/bash
# Validate environment before Terraform deployment

set -e

echo "=== Scale-to-Zero Deployment Environment Validation ==="
echo

# Check AWS CLI
echo "✓ Checking AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo "✗ AWS CLI not installed. Install: https://aws.amazon.com/cli/"
    exit 1
fi
echo "  AWS CLI version: $(aws --version)"

# Check AWS credentials
echo "✓ Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "✗ AWS credentials not configured. Run: aws configure"
    exit 1
fi
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
USER=$(aws sts get-caller-identity --query Arn --output text)
echo "  Account: $ACCOUNT_ID"
echo "  User: $USER"

# Check Terraform
echo "✓ Checking Terraform..."
if ! command -v terraform &> /dev/null; then
    echo "✗ Terraform not installed. Install: https://www.terraform.io/downloads"
    exit 1
fi
echo "  Terraform version: $(terraform version -json | jq -r '.terraform_version')"

# Check Node.js
echo "✓ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not installed. Install: https://nodejs.org"
    exit 1
fi
echo "  Node.js version: $(node --version)"

# Check jq
echo "✓ Checking jq..."
if ! command -v jq &> /dev/null; then
    echo "✗ jq not installed. Install: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check files
echo "✓ Checking required files..."
REQUIRED_FILES=(
    "main.tf"
    "variables.tf"
    "outputs.tf"
    "user-data.sh"
    "lambda_function.py"
    "package-lambda.sh"
    "terraform.tfvars.example"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "✗ Missing file: $file"
        exit 1
    fi
done
echo "  All required files present"

# Check terraform.tfvars
echo "✓ Checking terraform.tfvars..."
if [ ! -f "terraform.tfvars" ]; then
    echo "  ! terraform.tfvars not found"
    echo "  Creating from template..."
    cp terraform.tfvars.example terraform.tfvars
    echo "  ⚠ IMPORTANT: Edit terraform.tfvars with your domain and passwords!"
    echo "  nano terraform.tfvars"
    exit 1
fi

# Validate terraform.tfvars
echo "  Validating configuration..."
if grep -q "ChangeMe" terraform.tfvars; then
    echo "✗ terraform.tfvars contains placeholder values!"
    echo "  Please edit and replace:"
    grep "ChangeMe" terraform.tfvars
    exit 1
fi

# Check domain format
DOMAIN=$(grep "^domain_name" terraform.tfvars | awk -F'"' '{print $2}')
if [ -z "$DOMAIN" ]; then
    echo "✗ domain_name not set in terraform.tfvars"
    exit 1
fi
echo "  Domain: $DOMAIN"

# Validate domain is punycode format
if ! [[ "$DOMAIN" =~ ^xn-- ]]; then
    echo "✗ Domain should be punycode format (xn--...)"
    echo "  Got: $DOMAIN"
    exit 1
fi

# Check password lengths
echo "✓ Checking password configuration..."
DB_PASS=$(grep "^db_password" terraform.tfvars | awk -F'"' '{print $2}')
ODOO_PASS=$(grep "^odoo_master_password" terraform.tfvars | awk -F'"' '{print $2}')

if [ ${#DB_PASS} -lt 16 ]; then
    echo "✗ db_password too short (minimum 16 characters)"
    exit 1
fi

if [ ${#ODOO_PASS} -lt 16 ]; then
    echo "✗ odoo_master_password too short (minimum 16 characters)"
    exit 1
fi

echo "  db_password length: ${#DB_PASS} chars ✓"
echo "  odoo_master_password length: ${#ODOO_PASS} chars ✓"

# Check Route 53 hosted zone
echo "✓ Checking Route 53 hosted zone..."
ZONE_ID="Z07775881FT8NI2J8HAG8"
if ! aws route53 get-hosted-zone --id $ZONE_ID &> /dev/null; then
    echo "✗ Route 53 hosted zone not found: $ZONE_ID"
    echo "  Create a hosted zone for your domain first"
    exit 1
fi
echo "  Hosted zone: $ZONE_ID"

# Check Lambda zip
echo "✓ Checking Lambda package..."
if [ ! -f "lambda_function.zip" ]; then
    echo "  Lambda function not packaged"
    echo "  Running: ./package-lambda.sh"
    chmod +x package-lambda.sh
    ./package-lambda.sh
fi
echo "  lambda_function.zip present"

echo
echo "=== Validation Complete ✓ ==="
echo
echo "Next steps:"
echo "1. Review terraform plan: terraform plan"
echo "2. Apply infrastructure: terraform apply"
echo "3. Copy Lambda URL to CloudFlare worker: cloudflare/worker.js (CONFIG.WAKEUP_URL)"
echo "4. Deploy CloudFlare worker: cd ../cloudflare && wrangler deploy"
echo "5. Configure DNS records pointing to Elastic IP"
echo "6. Scale up ASG for first boot"
echo
echo "See DEPLOYMENT_AWS_SCALE_ZERO.md for detailed instructions"
