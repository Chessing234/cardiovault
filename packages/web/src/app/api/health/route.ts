import { NextResponse } from 'next/server';
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import { dynamoClient, rdsClient, TABLES, AURORA_CONFIG } from '@/lib/aws-config';
import { withCors } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  const services: { dynamodb: 'ok' | 'error'; aurora: 'ok' | 'error' } = {
    dynamodb: 'error',
    aurora: 'error',
  };

  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: TABLES.SESSIONS }));
    services.dynamodb = 'ok';
  } catch {
    services.dynamodb = 'error';
  }

  try {
    if (AURORA_CONFIG.resourceArn && AURORA_CONFIG.secretArn) {
      await rdsClient.send(
        new ExecuteStatementCommand({
          resourceArn: AURORA_CONFIG.resourceArn,
          secretArn: AURORA_CONFIG.secretArn,
          database: AURORA_CONFIG.database,
          sql: 'SELECT 1 AS ok',
          includeResultMetadata: false,
        }),
      );
      services.aurora = 'ok';
    }
  } catch {
    services.aurora = 'error';
  }

  const dynamoOk = services.dynamodb === 'ok';
  const auroraOk = services.aurora === 'ok';
  const healthy = dynamoOk && auroraOk;
  const degraded = dynamoOk || auroraOk;

  const status = healthy ? 'healthy' : degraded ? 'degraded' : 'unhealthy';
  const httpStatus = healthy || degraded ? 200 : 503;

  const body = {
    status,
    services,
    timestamp: new Date().toISOString(),
  };

  const res = NextResponse.json(body, { status: httpStatus });
  return withCors(res);
}
