#!/bin/bash
set -e

REGION="us-east-1"

echo "Getting latest Amazon Linux 2023 AMI..."
AMI=$(aws ec2 describe-images --owners amazon --filters "Name=name,Values=al2023-ami-*-x86_64" --query 'sort_by(Images, &CreationDate)[-1].ImageId' --output text --region $REGION)

echo "Creating security group..."
SG=$(aws ec2 create-security-group --group-name demo-rental-$(date +%s) --description "Demo rental app" --region $REGION --query 'GroupId' --output text)

echo "Opening ports 80, 443, 22..."
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1

# User data script
read -r -d '' USERDATA << 'BOOTSTRAP' || true
#!/bin/bash
set -e
yum update -y
yum install -y docker git nodejs nginx

# Install Docker Compose v2
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

cd /tmp
git clone https://github.com/TheOneWhoBurns/cpoint.git rental-app
cd rental-app

# Create .env file
cat > .env << 'ENV'
DATABASE_URL="postgresql://rental:rental_dev@localhost:5432/rental_manager"
NODE_ENV="production"
ENV

# Start PostgreSQL in Docker
docker-compose -f docker-compose.demo.yml up -d db
echo "Waiting for PostgreSQL to be ready..."
sleep 15

# Build app
npm ci
npm run build

# Create systemd service for app
cat > /etc/systemd/system/rental-app.service << 'SERVICE'
[Unit]
Description=Rental App
After=network.target
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=/tmp/rental-app
ExecStart=/usr/bin/node /tmp/rental-app/build
Environment="DATABASE_URL=postgresql://rental:rental_dev@localhost:5432/rental_manager"
Environment="NODE_ENV=production"
StandardOutput=journal
StandardError=journal
Restart=on-failure
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
SERVICE

# Start app service
systemctl daemon-reload
systemctl enable rental-app
systemctl start rental-app
sleep 3

# Configure nginx
cat > /etc/nginx/conf.d/rental.conf << 'NGINX'
upstream app {
    server 127.0.0.1:3000;
}
server {
    listen 80;
    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX

systemctl start nginx
systemctl enable nginx
systemctl reload nginx

echo "Rental app running on http://localhost:3000, nginx on port 80"
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
