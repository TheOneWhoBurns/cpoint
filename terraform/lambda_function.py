#!/usr/bin/env python3
"""
AWS Lambda function for scaling up Auto Scaling Group.

This function is triggered by CloudFlare Worker when the origin server
is detected to be offline. It scales up the ASG from 0 to 1, bringing
the EC2 instance back online.

Environment variables:
  ASG_NAME: Name of the Auto Scaling Group to scale up
"""

import json
import boto3
import os
from datetime import datetime

autoscaling = boto3.client('autoscaling')


def handler(event, context):
    """Lambda handler for ASG scale-up."""

    asg_name = os.environ.get('ASG_NAME')

    if not asg_name:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'ASG_NAME environment variable not set'})
        }

    try:
        # Get current ASG status
        response = autoscaling.describe_auto_scaling_groups(
            AutoScalingGroupNames=[asg_name]
        )

        if not response['AutoScalingGroups']:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'ASG {asg_name} not found'})
            }

        asg = response['AutoScalingGroups'][0]
        current_capacity = asg['DesiredCapacity']

        # Only scale up if currently scaled down
        if current_capacity == 0:
            autoscaling.set_desired_capacity(
                AutoScalingGroupName=asg_name,
                DesiredCapacity=1,
                HonorCooldown=False
            )

            message = f'Scaled up {asg_name} from 0 to 1'
        else:
            message = f'{asg_name} already at capacity {current_capacity}'

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': message,
                'asg': asg_name,
                'previous_capacity': current_capacity,
                'new_capacity': 1,
                'timestamp': datetime.utcnow().isoformat()
            })
        }

    except Exception as e:
        error_message = str(e)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to scale ASG',
                'details': error_message
            })
        }
