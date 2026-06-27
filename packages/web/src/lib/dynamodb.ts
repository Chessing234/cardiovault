import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';
import { docClient, TABLES } from './aws-config';

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const WALLET_GSI = 'walletAddress-index';
const METRICS_WALLET_GSI = 'walletAddress-index';
const METRICS_TYPE_TS_GSI = 'type-timestamp-index';

export interface Session {
  sessionId: string;
  walletAddress: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  riskScores: number[];
  preferences: Record<string, unknown>;
}

export interface Metric {
  metricId: string;
  walletAddress: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

function nowMs() {
  return Date.now();
}

function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isSessionExpired(item: Session & { expiresAt?: number }): boolean {
  const exp = item.expiresAt ?? 0;
  return exp < nowUnixSeconds();
}

export async function createSession(sessionId: string, walletAddress: string, data: Partial<Session>): Promise<void> {
  const t = nowMs();
  const exp = nowUnixSeconds() + SESSION_TTL_SECONDS;
  const wallet = walletAddress.toLowerCase();
  const item: Record<string, unknown> = {
    sessionId,
    walletAddress: wallet,
    nonce: data.nonce ?? randomBytes(16).toString('hex'),
    createdAt: t,
    expiresAt: exp,
    lastActivity: t,
    riskScores: data.riskScores ?? [],
    preferences: data.preferences ?? {},
  };
  await docClient.send(
    new PutCommand({
      TableName: TABLES.SESSIONS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(sessionId)',
    }),
  );
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: TABLES.SESSIONS, Key: { sessionId } }),
  );
  const item = res.Item as Session | undefined;
  if (!item) return null;
  if (isSessionExpired(item)) return null;
  return item;
}

export async function updateSession(sessionId: string, data: Partial<Session>): Promise<void> {
  const sets: string[] = ['#la = :la'];
  const names: Record<string, string> = { '#la': 'lastActivity' };
  const values: Record<string, unknown> = { ':la': nowMs() };
  let i = 0;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'sessionId' || k === 'walletAddress' || k === 'lastActivity') continue;
    if (v === undefined) continue;
    const nk = `#k${i}`;
    const vk = `:v${i}`;
    names[nk] = k;
    values[vk] = v;
    sets.push(`${nk} = ${vk}`);
    i++;
  }
  await docClient.send(
    new UpdateCommand({
      TableName: TABLES.SESSIONS,
      Key: { sessionId },
      UpdateExpression: 'SET ' + sets.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(sessionId)',
    }),
  );
}

export async function deleteSession(sessionId: string): Promise<void> {
  await docClient.send(new DeleteCommand({ TableName: TABLES.SESSIONS, Key: { sessionId } }));
}

export async function getSessionByWallet(walletAddress: string): Promise<Session | null> {
  const wallet = walletAddress.toLowerCase();
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLES.SESSIONS,
      IndexName: WALLET_GSI,
      KeyConditionExpression: 'walletAddress = :w',
      ExpressionAttributeValues: { ':w': wallet },
    }),
  );
  const items = (res.Items ?? []) as Session[];
  if (!items.length) return null;
  const sorted = items.sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
  for (const s of sorted) {
    if (!isSessionExpired(s)) return s;
  }
  return null;
}

export async function getCache(key: string): Promise<unknown | null> {
  const res = await docClient.send(new GetCommand({ TableName: TABLES.CACHE, Key: { key } }));
  const item = res.Item as { value?: unknown; ttl?: number } | undefined;
  if (!item) return null;
  if (typeof item.ttl === 'number' && item.ttl < nowUnixSeconds()) return null;
  return item.value ?? null;
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const ttl = nowUnixSeconds() + ttlSeconds;
  await docClient.send(
    new PutCommand({
      TableName: TABLES.CACHE,
      Item: { key, value, ttl },
    }),
  );
}

export async function invalidateCache(key: string): Promise<void> {
  await docClient.send(new DeleteCommand({ TableName: TABLES.CACHE, Key: { key } }));
}

export async function recordMetric(type: string, walletAddress: string, data: Record<string, unknown>): Promise<void> {
  const metricId = `${Date.now()}-${randomBytes(6).toString('hex')}`;
  const timestamp = nowMs();
  await docClient.send(
    new PutCommand({
      TableName: TABLES.METRICS,
      Item: {
        metricId,
        walletAddress: walletAddress.toLowerCase(),
        type,
        data,
        timestamp,
      },
      ConditionExpression: 'attribute_not_exists(metricId)',
    }),
  );
}

/** Bulk metric writes (max 25 per request per DynamoDB limits). */
export async function recordMetricsBatch(entries: Omit<Metric, 'metricId'>[]): Promise<void> {
  if (!entries.length) return;
  for (let i = 0; i < entries.length; i += 25) {
    const chunk = entries.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLES.METRICS]: chunk.map((e) => ({
            PutRequest: {
              Item: {
                metricId: `${Date.now()}-${randomBytes(4).toString('hex')}-${Math.random().toString(36).slice(2, 8)}`,
                walletAddress: e.walletAddress.toLowerCase(),
                type: e.type,
                data: e.data,
                timestamp: e.timestamp,
              },
            },
          })),
        },
      }),
    );
  }
}

export async function getMetricsForWallet(
  walletAddress: string,
  type?: string,
  limit = 50,
): Promise<Metric[]> {
  const wallet = walletAddress.toLowerCase();
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLES.METRICS,
      IndexName: METRICS_WALLET_GSI,
      KeyConditionExpression: 'walletAddress = :w',
      ExpressionAttributeValues: type
        ? { ':w': wallet, ':t': type }
        : { ':w': wallet },
      FilterExpression: type ? '#ty = :t' : undefined,
      ExpressionAttributeNames: type ? { '#ty': 'type' } : undefined,
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []) as Metric[];
}

export async function getRecentMetrics(type: string, hours = 24): Promise<Metric[]> {
  const since = nowMs() - hours * 60 * 60 * 1000;
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLES.METRICS,
      IndexName: METRICS_TYPE_TS_GSI,
      KeyConditionExpression: '#t = :t AND #ts >= :since',
      ExpressionAttributeNames: { '#t': 'type', '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':t': type, ':since': since },
      ScanIndexForward: false,
      Limit: 500,
    }),
  );
  return (res.Items ?? []) as Metric[];
}
