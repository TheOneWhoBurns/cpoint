#!/bin/bash
# Demo instance with rental app + PostgreSQL in Docker
set -e

REGION="us-east-1"
DB_PASSWORD="${1:-changeme123}"

echo "Getting latest Amazon Linux 2 AMI..."
AMI=$(aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text --region $REGION)

echo "Creating security group..."
SG=$(aws ec2 create-security-group --group-name demo-rental-$(date +%s) --description "Demo rental app" --region $REGION --query 'GroupId' --output text)

echo "Opening ports 80, 443, 22..."
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1

# User data script to deploy docker-compose
read -r -d '' USERDATA << 'BOOTSTRAP' || true
#!/bin/bash
yum update -y
yum install -y docker git
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

cd /tmp
git clone https://github.com/TheOneWhoBurns/cpoint.git rental-app || mkdir -p rental-app
cd rental-app

# Create .env for docker-compose
cat > .env << EOF
DB_PASSWORD=changeme123
NODE_ENV=production
EOF

# Start docker-compose
docker-compose -f docker-compose.demo.yml up -d

# Wait for app to be ready
sleep 10
docker-compose -f docker-compose.demo.yml exec -T db psql -U rental -d rental_manager -c "SELECT 1" || true
BOOTSTRAP

echo "Launching t3.small instance (needs more resources for Docker)..."
INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI \
  --instance-type t3.small \
  --security-group-ids $SG \
  --user-data "$USERDATA" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=demo-rental}]" \
  --region $REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Waiting for public IP..."
sleep 8

IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text \
  --region $REGION)

echo ""
echo "=========================================="
echo "✓ DEMO APP LAUNCHING"
echo "=========================================="
echo ""
echo "Instance ID:  $INSTANCE"
echo "Public IP:    $IP"
echo ""
echo "Apps loading (takes ~2 minutes):"
echo "  Rental System: http://$IP"
echo ""
echo "Point your DNS to this IP:"
echo "  Namecheap → xn--caonpoint-m6a.com → A record → $IP"
echo ""
echo "To terminate:"
echo "  aws ec2 terminate-instances --instance-ids $INSTANCE --region $REGION"
echo ""
