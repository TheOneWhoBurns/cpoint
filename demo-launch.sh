#!/bin/bash
set -e

REGION="us-east-1"
AMI="ami-024a77f24c8c31435"

echo "Using pre-built rental app AMI..."
SG=$(aws ec2 create-security-group --group-name demo-rental-$(date +%s) --description "Demo rental app" --region $REGION --query 'GroupId' --output text)

echo "Opening ports 80, 443, 22..."
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION >/dev/null 2>&1

echo "Launching t3.small instance (needs more resources for Docker)..."
INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI \
  --instance-type t3.small \
  --security-group-ids $SG \
  --key-name Claude_Code_Power_User \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=demo-rental}]" \
  --region $REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Allocating Elastic IP..."
ALLOC=$(aws ec2 allocate-address --domain vpc --region $REGION --query 'AllocationId' --output text)
EIP=$(aws ec2 describe-addresses --allocation-ids $ALLOC --region $REGION --query 'Addresses[0].PublicIp' --output text)

echo "Waiting for instance to be ready..."
sleep 8

echo "Associating Elastic IP to instance..."
aws ec2 associate-address --instance-id $INSTANCE --allocation-id $ALLOC --region $REGION >/dev/null

IP=$EIP

echo ""
echo "=========================================="
echo "✓ DEMO APP LAUNCHED"
echo "=========================================="
echo ""
echo "Instance ID:     $INSTANCE"
echo "Elastic IP:      $IP (stable across restarts)"
echo ""
echo "Ready immediately (pre-built AMI, no bootstrap):"
echo "  Rental System: http://$IP"
echo ""
echo "Services auto-start on reboot."
echo ""
echo "Update DNS once (IP stays the same):"
echo "  Route 53 or Namecheap: xn--caonpoint-m6a.com → $IP"
echo ""
echo "To terminate and release resources:"
echo "  aws ec2 terminate-instances --instance-ids $INSTANCE --region $REGION"
echo "  aws ec2 release-address --allocation-id $ALLOC --region $REGION"
echo ""
