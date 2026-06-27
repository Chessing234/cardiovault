#!/usr/bin/env bash
set -euo pipefail

echo "=== CardioVault AWS Infrastructure Deployment ==="

REGION="${AWS_REGION:-us-east-1}"
BUCKET="${S3_MEDICAL_IMAGES_BUCKET:-cardiovault-medical-images-prod}"

echo "Setting up S3 bucket: ${BUCKET} (${REGION})..."

if aws s3api head-bucket --bucket "${BUCKET}" 2>/dev/null; then
  echo "Bucket already exists."
else
  if [[ "${REGION}" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket \
      --bucket "${BUCKET}" \
      --region "${REGION}" \
      --create-bucket-configuration LocationConstraint="${REGION}"
  fi
fi

aws s3api put-bucket-encryption \
  --bucket "${BUCKET}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "=== Deployment Complete ==="
echo "S3 Bucket: ${BUCKET}"
