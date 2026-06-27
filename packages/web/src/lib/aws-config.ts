import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { RDSDataClient } from '@aws-sdk/client-rds-data';

/** True when running on AWS Lambda (IAM role credentials). */
export const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.AWS_EXECUTION_ENV;

/** Local Next.js dev server — optional explicit access keys from .env */
const isLocalDev = process.env.NODE_ENV === 'development';

const awsConfig = isLocalDev
  ? {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    }
  : { region: process.env.AWS_REGION || 'us-east-1' };

export const dynamoClient = new DynamoDBClient(awsConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
export const s3Client = new S3Client(awsConfig);
export const rdsClient = new RDSDataClient(awsConfig);

export const TABLES = {
  SESSIONS: process.env.DYNAMODB_SESSION_TABLE || 'cardiovault-sessions',
  CACHE: process.env.DYNAMODB_CACHE_TABLE || 'cardiovault-cache',
  METRICS: process.env.DYNAMODB_METRICS_TABLE || 'cardiovault-metrics',
} as const;

/** Aurora / RDS Data API (PostgreSQL-compatible; e.g. Aurora DSQL via Data API endpoints). */
export const AURORA_CONFIG = {
  resourceArn: process.env.AURORA_RESOURCE_ARN || '',
  secretArn: process.env.AURORA_SECRET_ARN || '',
  database: process.env.AURORA_DATABASE || 'cardiovault',
  schema: process.env.AURORA_SCHEMA || 'public',
} as const;

export const S3_CONFIG = {
  bucket: process.env.S3_MEDICAL_IMAGES_BUCKET || 'cardiovault-medical-images',
  region: process.env.AWS_REGION || 'us-east-1',
} as const;
