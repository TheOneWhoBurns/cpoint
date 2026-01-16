#!/bin/bash
set -e

# Logging
exec > >(tee -a /var/log/user-data.log)
exec 2>&1
echo "=== User Data Script Started at $(date) ==="

# Variables
EFS_ID="${efs_id}"
BACKUP_BUCKET="${backup_bucket}"
AZ="${availability_zone}"
DOMAIN="${domain_name}"
SUBDOMAIN_ODOO="${subdomain_odoo}"
DB_PASSWORD="${db_password}"
ODOO_MASTER_PASSWORD="${odoo_master_password}"
ENVIRONMENT="${environment}"

# Paths
EFS_MOUNT="/mnt/efs"
APP_DIR="/opt/rental-system"
ODOO_DIR="/opt/odoo"
BACKUP_SCRIPT="/usr/local/bin/backup.sh"
BACKUP_LOG="/var/log/backup.log"

echo "=== Configuration ==="
echo "EFS ID: $EFS_ID"
echo "Domain: $DOMAIN"
echo "Odoo Subdomain: $SUBDOMAIN_ODOO"
echo "Environment: $ENVIRONMENT"

# Update system
echo "=== Updating system ==="
yum update -y
yum install -y amazon-efs-utils amazon-cloudwatch-agent git curl wget htop nano
yum groupinstall -y "Development Tools"

# Create directories
echo "=== Creating directories ==="
mkdir -p $EFS_MOUNT
mkdir -p /var/log/rental-system
mkdir -p /var/lib/odoo

# Mount EFS
echo "=== Mounting EFS ==="
mount -t efs -o tls $EFS_ID:/ $EFS_MOUNT
mkdir -p $EFS_MOUNT/postgresql
mkdir -p $EFS_MOUNT/odoo-filestore
mkdir -p $EFS_MOUNT/backups

# Add to fstab for persistent mounting
if ! grep -q "$EFS_ID" /etc/fstab; then
  echo "$EFS_ID:/ $EFS_MOUNT efs _netdev,tls 0 0" >> /etc/fstab
fi

# Install Docker
echo "=== Installing Docker ==="
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose
echo "=== Installing Docker Compose ==="
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
echo "=== Installing Node.js 20 ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install PostgreSQL 16
echo "=== Installing PostgreSQL 16 ==="
yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-aarch64/pgdg-redhat-repo-latest.noarch.rpm
yum install -y postgresql16-server postgresql16-contrib postgresql16-devel

# Initialize PostgreSQL
echo "=== Initializing PostgreSQL ==="
/usr/pgsql-16/bin/initdb -D $EFS_MOUNT/postgresql -A md5

# Configure PostgreSQL
cat > /etc/systemd/system/postgresql-16.service <<'EOF'
[Unit]
Description=PostgreSQL 16 Database Server
After=network.target

[Service]
Type=notify
User=postgres
ExecStart=/usr/pgsql-16/bin/postgres -D /mnt/efs/postgresql
Restart=on-failure
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/run/postgresql
chown postgres:postgres /var/run/postgresql
chmod 2775 /var/run/postgresql

# Start PostgreSQL
systemctl daemon-reload
systemctl enable postgresql-16
systemctl start postgresql-16

# Wait for PostgreSQL to be ready
sleep 5

# Create databases
echo "=== Creating PostgreSQL databases ==="
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres createdb rental_manager || true
sudo -u postgres psql -c "CREATE USER rental WITH PASSWORD '$DB_PASSWORD';" || true
sudo -u postgres psql -c "ALTER USER rental WITH CREATEDB;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rental_manager TO rental;" || true

# Clone rental system repository
echo "=== Cloning rental-system repository ==="
mkdir -p $APP_DIR
cd $APP_DIR

# Check if already cloned
if [ ! -d ".git" ]; then
  # This should be customized with your repo URL
  git clone https://github.com/YOUR_ORG/cpoint.git . || \
  git init
fi

# Install rental app dependencies
echo "=== Installing rental app dependencies ==="
npm ci || npm install
npm run build || echo "Build failed, will retry after app files are in place"

# Create .env.production
echo "=== Configuring rental app environment ==="
cat > $APP_DIR/.env.production <<EOF
DATABASE_URL=postgresql://rental:${DB_PASSWORD}@localhost:5432/rental_manager
NODE_ENV=production
DOMAIN=$DOMAIN
EOF

# Initialize rental app database
echo "=== Initializing rental app database ==="
cd $APP_DIR
npm run db:push || echo "Database push failed, may need manual intervention"

# Install Odoo dependencies
echo "=== Installing Odoo dependencies ==="
yum install -y python3 python3-pip python3-devel wkhtmltopdf
pip3 install --upgrade pip
pip3 install setuptools wheel

# Clone Odoo 17
echo "=== Setting up Odoo 17 ==="
mkdir -p $ODOO_DIR
cd $ODOO_DIR

# Check if already cloned
if [ ! -d ".git" ]; then
  git clone --depth 1 --branch 17.0 https://github.com/odoo/odoo.git . || \
  mkdir -p $ODOO_DIR
fi

# Install Odoo requirements
if [ -f "requirements.txt" ]; then
  pip3 install -r requirements.txt
else
  pip3 install lxml Pillow reportlab python-dateutil pytz requests Werkzeug MarkupSafe six psycopg2-binary
fi

# Create Odoo config
echo "=== Configuring Odoo ==="
mkdir -p /etc/odoo
cat > /etc/odoo/odoo.conf <<EOF
[options]
admin_passwd = $ODOO_MASTER_PASSWORD
db_user = rental
db_password = $DB_PASSWORD
db_host = localhost
db_port = 5432
db_name = false
addons_path = $ODOO_DIR/addons,$ODOO_DIR/custom-addons
data_dir = $EFS_MOUNT/odoo-filestore
logfile = /var/log/odoo/odoo.log
log_level = info
workers = 4
worker_class = gevent
max_cron_threads = 2
limit_memory_hard = 2684354560
limit_memory_soft = 2147483648
limit_request = 8192
limit_time_cpu = 600
limit_time_real = 1200
xmlrpc_port = 8069
xmlrpc_interface = 127.0.0.1
EOF

mkdir -p /var/log/odoo
chown -R nobody:nobody /var/log/odoo
chown -R nobody:nobody $EFS_MOUNT/odoo-filestore

# Create Odoo systemd service
echo "=== Creating Odoo systemd service ==="
cat > /etc/systemd/system/odoo.service <<'EOF'
[Unit]
Description=Odoo ERP
After=network.target postgresql-16.service

[Service]
Type=simple
User=nobody
Group=nobody
ExecStart=/usr/bin/python3 /opt/odoo/odoo-bin -c /etc/odoo/odoo.conf
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create rental app systemd service
echo "=== Creating rental app systemd service ==="
cat > /etc/systemd/system/rental-app.service <<EOF
[Unit]
Description=Rental System SvelteKit App
After=network.target postgresql-16.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node build
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://rental:${DB_PASSWORD}@localhost:5432/rental_manager"

[Install]
WantedBy=multi-user.target
EOF

# Install and configure Nginx
echo "=== Installing and configuring Nginx ==="
yum install -y nginx

cat > /etc/nginx/nginx.conf <<'NGINX_CONF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;

    # SSL configuration (paths will be created with Let's Encrypt)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web_limit:10m rate=30r/s;

    # Rental System Upstream
    upstream rental_app {
        server 127.0.0.1:3000;
    }

    # Odoo Upstream
    upstream odoo_app {
        server 127.0.0.1:8069;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main domain - Rental System
    server {
        listen 443 ssl http2 default_server;
        listen [::]:443 ssl http2 default_server;
        server_name DOMAIN_NAME;

        # SSL certificates will be provisioned by Certbot
        ssl_certificate /etc/letsencrypt/live/DOMAIN_NAME/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_NAME/privkey.pem;

        location / {
            proxy_pass http://rental_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            limit_req zone=web_limit burst=50;
        }

        location /api {
            proxy_pass http://rental_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            limit_req zone=api_limit burst=20;
        }

        location /health {
            access_log off;
            proxy_pass http://rental_app;
            proxy_set_header Host $host;
        }
    }

    # Odoo subdomain
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name SUBDOMAIN_ODOO.DOMAIN_NAME;

        # SSL certificates will be provisioned by Certbot
        ssl_certificate /etc/letsencrypt/live/DOMAIN_NAME/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN_NAME/privkey.pem;

        # Increase buffer sizes for Odoo
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;

        location / {
            proxy_pass http://odoo_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;

            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /longpolling {
            proxy_pass http://odoo_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
NGINX_CONF

# Replace domain names
sed -i "s/DOMAIN_NAME/$DOMAIN/g" /etc/nginx/nginx.conf
sed -i "s/SUBDOMAIN_ODOO/$SUBDOMAIN_ODOO/g" /etc/nginx/nginx.conf

# Enable and start Nginx
systemctl enable nginx

# Install Certbot for Let's Encrypt SSL
echo "=== Installing Certbot for SSL ==="
yum install -y certbot python3-certbot-nginx

# Request initial SSL certificates (non-interactive for automation)
# This may fail first time if domain isn't resolving yet - will be retried manually
echo "=== Requesting SSL certificates ==="
certbot certonly --nginx --non-interactive --agree-tos -m admin@$DOMAIN \
  -d $DOMAIN -d $SUBDOMAIN_ODOO.$DOMAIN 2>&1 | tee -a /var/log/user-data.log || \
  echo "SSL certificate request failed - will retry after DNS is configured"

# Enable SSL auto-renewal
systemctl enable certbot.timer || true
systemctl start certbot.timer || true

# Create backup script
echo "=== Creating backup script ==="
cat > $BACKUP_SCRIPT <<'BACKUP_SCRIPT_EOF'
#!/bin/bash
set -e

BACKUP_DIR="/mnt/efs/backups"
BUCKET="BACKUP_BUCKET"
DATE=$(date +%Y%m%d_%H%M%S)
TODAY=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR/daily
mkdir -p $BACKUP_DIR/weekly

# PostgreSQL backup (both databases)
echo "Backing up PostgreSQL..." | tee -a /var/log/backup.log
pg_dump -U rental rental_manager | gzip > $BACKUP_DIR/daily/rental_manager_$DATE.sql.gz
pg_dump -U rental odoo | gzip > $BACKUP_DIR/daily/odoo_$DATE.sql.gz || true

# Odoo filestore backup
echo "Backing up Odoo filestore..." | tee -a /var/log/backup.log
tar -czf $BACKUP_DIR/daily/odoo_filestore_$DATE.tar.gz -C /mnt/efs odoo-filestore 2>/dev/null || true

# Upload to S3
echo "Uploading to S3..." | tee -a /var/log/backup.log
aws s3 sync $BACKUP_DIR/daily/ s3://$BUCKET/daily/ --delete --quiet

# Keep weekly backups
cp $BACKUP_DIR/daily/rental_manager_$DATE.sql.gz $BACKUP_DIR/weekly/rental_manager_$TODAY.sql.gz || true

echo "Backup completed at $(date)" | tee -a /var/log/backup.log
BACKUP_SCRIPT_EOF

chmod +x $BACKUP_SCRIPT
sed -i "s|BACKUP_BUCKET|$BACKUP_BUCKET|g" $BACKUP_SCRIPT

# Create cron job for daily backups at 3 AM
echo "=== Setting up backup cron job ==="
echo "0 3 * * * $BACKUP_SCRIPT >> $BACKUP_LOG 2>&1" | crontab -

# Enable cron
systemctl enable crond
systemctl start crond

# Create health check script
echo "=== Creating health check script ==="
mkdir -p /usr/local/bin
cat > /usr/local/bin/health-check.sh <<'EOF'
#!/bin/bash

# Check if apps are running
RENTAL_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
ODOO_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8069 || echo "000")
DB_HEALTH=$(sudo -u postgres psql -c "SELECT 1" > /dev/null 2>&1 && echo "ok" || echo "fail")

if [ "$RENTAL_HEALTH" != "200" ] && [ "$RENTAL_HEALTH" != "000" ]; then
  systemctl restart rental-app || true
fi

if [ "$DB_HEALTH" != "ok" ]; then
  systemctl restart postgresql-16 || true
fi

echo "Health check: Rental=$RENTAL_HEALTH, Odoo=$ODOO_HEALTH, DB=$DB_HEALTH"
EOF

chmod +x /usr/local/bin/health-check.sh

# Create cron job for health checks
echo "*/5 * * * * /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1" | crontab -

# Enable systemd services
echo "=== Enabling systemd services ==="
systemctl daemon-reload
systemctl enable postgresql-16
systemctl enable rental-app || echo "Rental app service not ready yet"
systemctl enable odoo || echo "Odoo service not ready yet"
systemctl enable nginx
systemctl start postgresql-16

# Start rental app (may fail if code not fully ready)
systemctl start rental-app 2>/dev/null || echo "Rental app will be started manually after code deployment"

# Start Odoo (will create database on first run)
systemctl start odoo 2>/dev/null || echo "Odoo will be started manually"

# Start Nginx
systemctl start nginx

# CloudWatch agent configuration
echo "=== Configuring CloudWatch agent ==="
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/rental-system/*.log",
            "log_group_name": "/aws/ec2/rental-system",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/odoo/odoo.log",
            "log_group_name": "/aws/ec2/odoo",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "RentalSystem",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ]
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "/"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a query -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s || true

echo "=== User Data Script Completed at $(date) ==="
echo "Next steps:"
echo "1. Wait 5 minutes for services to stabilize"
echo "2. SSH to the instance and check: sudo systemctl status postgresql-16 rental-app nginx"
echo "3. Run database migration: cd $APP_DIR && npm run db:push"
echo "4. Access rental app at https://$DOMAIN"
echo "5. Access Odoo at https://$SUBDOMAIN_ODOO.$DOMAIN and create master password and database"
