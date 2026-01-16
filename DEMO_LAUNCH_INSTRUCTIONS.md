# Demo Instance - Rental App + PostgreSQL

Launch a temporary EC2 with the rental app running in Docker.

## Launch Demo

```bash
chmod +x demo-launch.sh
./demo-launch.sh
```

This will:
- Create security group
- Launch t3.small instance
- Install Docker & Docker Compose
- Clone rental app repo
- Start PostgreSQL + Rental app in Docker containers
- Output public IP

**Output:**
```
Instance ID:  i-0123456789abcdef0
Public IP:    203.0.113.45

Apps loading (takes ~2 minutes):
  Rental System: http://203.0.113.45

Point your DNS to this IP:
  Namecheap → xn--caonpoint-m6a.com → A record → 203.0.113.45
```

## Access the App

Wait 2-3 minutes for Docker containers to start, then:
```
http://203.0.113.45
```

Should show the rental management interface.

## Check Status Later

```bash
source demo-commands.sh
show_status
```

## Terminate When Done

```bash
source demo-commands.sh
terminate_demo
```

Or directly:
```bash
aws ec2 terminate-instances --instance-ids i-0123456789abcdef0 --region us-east-1
```

## What's Running

- **PostgreSQL 16** in Docker container (port 5432)
- **Rental App** (SvelteKit) in Docker container (port 3000)
- **Nginx** reverse proxy (port 80)
- Data persists as long as instance runs (lost on termination)

## Customization

Default database password: `changeme123`

To use different password, edit `docker-compose.demo.yml` or `.env`:
```bash
cp .env.demo.example .env
nano .env  # Change DB_PASSWORD
docker-compose -f docker-compose.demo.yml up -d
```

## Architecture

```
EC2 Instance (t3.small)
├── Docker daemon
├── PostgreSQL 16 container
├── Rental app (Node.js) container
└── Nginx container
```

All containers defined in `docker-compose.demo.yml`.

## Costs

- **Running**: ~$0.02/hour (t3.small)
- **Minimal**: Just instance time
- **Terminate to stop charges**

## Next Steps

1. Verify app loads: http://18.215.178.196
2. Point DNS in Namecheap to this IP
3. Wait 10-15 minutes for DNS propagation
4. Access via domain name when ready
5. For production: Deploy full Terraform infrastructure

---

**Quick start**: `./demo-launch.sh` → wait 2 min → visit http://<IP>
