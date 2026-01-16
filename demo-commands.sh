#!/bin/bash
# Helper commands for managing demo instance

# Get the running demo instance ID
get_demo_instance() {
  aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=demo-rental" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text \
    --region us-east-1
}

# Get the public IP
get_demo_ip() {
  INSTANCE=$(get_demo_instance)
  if [ -z "$INSTANCE" ] || [ "$INSTANCE" = "None" ]; then
    echo "No running demo instance found"
    return 1
  fi
  aws ec2 describe-instances \
    --instance-ids $INSTANCE \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region us-east-1
}

# Show demo instance status
show_status() {
  INSTANCE=$(get_demo_instance)
  if [ -z "$INSTANCE" ] || [ "$INSTANCE" = "None" ]; then
    echo "No running demo instance found"
    return 1
  fi
  IP=$(get_demo_ip)
  echo "Instance ID: $INSTANCE"
  echo "Public IP: $IP"
  echo "Test: http://$IP"
}

# Terminate demo instance
terminate_demo() {
  INSTANCE=$(get_demo_instance)
  if [ -z "$INSTANCE" ] || [ "$INSTANCE" = "None" ]; then
    echo "No running demo instance found"
    return 1
  fi
  echo "Terminating instance $INSTANCE..."
  aws ec2 terminate-instances --instance-ids $INSTANCE --region us-east-1
  echo "Instance terminated. Use 'get_demo_ip' to check status."
}

# Print help
show_help() {
  echo "Demo instance management commands:"
  echo ""
  echo "  source demo-commands.sh  # Load these functions"
  echo ""
  echo "  get_demo_instance        # Get instance ID of running demo"
  echo "  get_demo_ip              # Get public IP of running demo"
  echo "  show_status              # Show demo instance status and access info"
  echo "  terminate_demo           # Terminate the demo instance"
  echo ""
  echo "Example:"
  echo "  \$ source demo-commands.sh"
  echo "  \$ show_status"
}

# If sourced, show help
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  show_help
fi
