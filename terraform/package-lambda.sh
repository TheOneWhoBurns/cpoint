#!/bin/bash
# Package Lambda function for Terraform deployment

set -e

echo "Packaging Lambda function..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy Lambda function
cp lambda_function.py $TEMP_DIR/index.py

# Create zip file
cd $TEMP_DIR
zip -r lambda_function.zip index.py

# Move to terraform directory
mv lambda_function.zip ../

cd -

echo "Lambda function packaged: lambda_function.zip"
echo "Ready for terraform apply"
