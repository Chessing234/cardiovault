#!/usr/bin/env bash
# CardioVault — minimal AWS resources for dev/hackathon (DynamoDB + S3).
# Requires: aws CLI v2, credentials (`aws configure` or env vars).
# Idempotent: skips create when the resource already exists.
#
# NOTE: `aws dynamodb create-table` fails if the table exists — we guard with describe-table.
# NOTE: S3 bucket names are globally unique — override BUCKET if `cardiovault-medical-images` is taken.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-cardiovault}"
SESSIONS_TABLE="${DYNAMODB_SESSION_TABLE:-cardiovault-sessions}"
CACHE_TABLE="${DYNAMODB_CACHE_TABLE:-cardiovault-cache}"
METRICS_TABLE="${DYNAMODB_METRICS_TABLE:-cardiovault-metrics}"
BUCKET="${S3_MEDICAL_IMAGES_BUCKET:-cardiovault-medical-images}"

echo "Region: $REGION  Stack tag: $STACK_NAME"

if aws dynamodb describe-table --table-name "$SESSIONS_TABLE" --region "$REGION" &>/dev/null; then
  echo "DynamoDB table exists: $SESSIONS_TABLE"
else
  echo "Creating DynamoDB table: $SESSIONS_TABLE"
  aws dynamodb create-table \
    --table-name "$SESSIONS_TABLE" \
    --attribute-definitions \
      AttributeName=sessionId,AttributeType=S \
      AttributeName=walletAddress,AttributeType=S \
    --key-schema AttributeName=sessionId,KeyType=HASH \
    --global-secondary-indexes \
      "IndexName=walletAddress-index,KeySchema=[{AttributeName=walletAddress,KeyType=HASH}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST \
    --tags "Key=Project,Value=$STACK_NAME" \
    --region "$REGION"
fi

if aws dynamodb describe-table --table-name "$CACHE_TABLE" --region "$REGION" &>/dev/null; then
  echo "DynamoDB table exists: $CACHE_TABLE"
else
  echo "Creating DynamoDB table: $CACHE_TABLE"
  aws dynamodb create-table \
    --table-name "$CACHE_TABLE" \
    --attribute-definitions AttributeName=key,AttributeType=S \
    --key-schema AttributeName=key,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --tags "Key=Project,Value=$STACK_NAME" \
    --region "$REGION"
fi

if aws dynamodb describe-table --table-name "$METRICS_TABLE" --region "$REGION" &>/dev/null; then
  echo "DynamoDB table exists: $METRICS_TABLE"
else
  echo "Creating DynamoDB table: $METRICS_TABLE"
  aws dynamodb create-table \
    --table-name "$METRICS_TABLE" \
    --attribute-definitions \
      AttributeName=metricId,AttributeType=S \
      AttributeName=walletAddress,AttributeType=S \
      AttributeName=type,AttributeType=S \
      AttributeName=timestamp,AttributeType=N \
    --key-schema AttributeName=metricId,KeyType=HASH \
    --global-secondary-indexes \
      "IndexName=walletAddress-index,KeySchema=[{AttributeName=walletAddress,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
      "IndexName=type-timestamp-index,KeySchema=[{AttributeName=type,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST \
    --tags "Key=Project,Value=$STACK_NAME" \
    --region "$REGION"
fi

echo "Enabling TTL on sessions (expiresAt)..."
aws dynamodb update-time-to-live \
  --table-name "$SESSIONS_TABLE" \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
  --region "$REGION" || true

echo "Enabling TTL on cache (ttl)..."
aws dynamodb update-time-to-live \
  --table-name "$CACHE_TABLE" \
  --time-to-live-specification "Enabled=true,AttributeName=ttl" \
  --region "$REGION" || true

if aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null; then
  echo "S3 bucket exists: $BUCKET"
else
  echo "Creating S3 bucket: $BUCKET"
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi
fi

echo "Configuring default SSE-S3 encryption..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --region "$REGION"

echo "Blocking public access..."
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --region "$REGION"

echo ""
echo "Done. Set in .env:"
echo "  AWS_REGION=$REGION"
echo "  DYNAMODB_SESSION_TABLE=$SESSIONS_TABLE"
echo "  DYNAMODB_CACHE_TABLE=$CACHE_TABLE"
echo "  DYNAMODB_METRICS_TABLE=$METRICS_TABLE"
echo "  S3_MEDICAL_IMAGES_BUCKET=$BUCKET"
echo "  AURORA_RESOURCE_ARN=...   # from Aurora DSQL / RDS console"
echo "  AURORA_SECRET_ARN=..."
echo ""
echo "Aurora DSQL / PostgreSQL schema: run ensureSchema() from @/lib/aurora once, or apply the SQL in aurora.ts comments."
