/**
 * Aurora DSQL / PostgreSQL via RDS Data API (HTTP, no persistent connections).
 *
 * Reference schema (run once, e.g. `ensureSchema()` or migrations):
 *
 * CREATE TABLE IF NOT EXISTS risk_assessments (
 *     id SERIAL PRIMARY KEY,
 *     wallet_address VARCHAR(42) NOT NULL,
 *     risk_score DECIMAL(5,2) NOT NULL,
 *     factors JSONB NOT NULL,
 *     model_version VARCHAR(20) NOT NULL,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     proof_commitment VARCHAR(66)
 * );
 * CREATE INDEX IF NOT EXISTS idx_risk_wallet ON risk_assessments(wallet_address, created_at DESC);
 *
 * CREATE TABLE IF NOT EXISTS medical_images (
 *     id SERIAL PRIMARY KEY,
 *     wallet_address VARCHAR(42) NOT NULL,
 *     s3_key VARCHAR(255) NOT NULL,
 *     image_type VARCHAR(50) NOT NULL,
 *     metadata JSONB,
 *     uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     encryption_key_id VARCHAR(100),
 *     deleted_at TIMESTAMP NULL
 * );
 * CREATE INDEX IF NOT EXISTS idx_images_wallet ON medical_images(wallet_address, uploaded_at DESC);
 *
 * CREATE TABLE IF NOT EXISTS access_logs (
 *     id SERIAL PRIMARY KEY,
 *     wallet_address VARCHAR(42) NOT NULL,
 *     accessor_address VARCHAR(42) NOT NULL,
 *     action VARCHAR(20) NOT NULL,
 *     resource_type VARCHAR(50) NOT NULL,
 *     details JSONB,
 *     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * CREATE INDEX IF NOT EXISTS idx_access_wallet ON access_logs(wallet_address, created_at DESC);
 *
 * CREATE TABLE IF NOT EXISTS population_stats (
 *     id SERIAL PRIMARY KEY,
 *     metric_name VARCHAR(50) NOT NULL,
 *     metric_value DECIMAL(10,2) NOT NULL,
 *     demographic_filters JSONB,
 *     calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     sample_size INTEGER NOT NULL
 * );
 */

import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RollbackTransactionCommand,
  type Field,
  type SqlParameter,
  type ColumnMetadata,
} from '@aws-sdk/client-rds-data';
import { rdsClient, AURORA_CONFIG } from './aws-config';

function assertConfigured() {
  if (!AURORA_CONFIG.resourceArn || !AURORA_CONFIG.secretArn) {
    throw new Error('Aurora Data API is not configured: set AURORA_RESOURCE_ARN and AURORA_SECRET_ARN');
  }
}

function jsToField(value: unknown): Field {
  if (value === null || value === undefined) return { isNull: true };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { longValue: value };
    return { doubleValue: value };
  }
  if (typeof value === 'bigint') return { longValue: Number(value) };
  if (typeof value === 'object') return { stringValue: JSON.stringify(value) };
  return { stringValue: String(value) };
}

function fieldToJs(f: Field | undefined): unknown {
  if (!f || f.isNull) return null;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.longValue !== undefined) return f.longValue;
  if (f.doubleValue !== undefined) return f.doubleValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.blobValue !== undefined) return f.blobValue;
  return null;
}

function hydrateRow(fields: Field[] | undefined, meta: ColumnMetadata[] | undefined): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (!fields || !meta) return row;
  fields.forEach((f, i) => {
    const name = meta[i]?.name || meta[i]?.label || `col_${i}`;
    if (name) row[String(name)] = fieldToJs(f);
  });
  return row;
}

function formatResult(out: {
  records?: Field[][];
  columnMetadata?: ColumnMetadata[];
}): Record<string, unknown>[] {
  const meta = out.columnMetadata ?? [];
  return (out.records ?? []).map((r) => hydrateRow(r, meta));
}

/** Replace each `?` with :p0, :p1, ... and build SqlParameter list. */
function buildParameterizedSql(sql: string, parameters: unknown[] = []): { sql: string; parameters: SqlParameter[] } {
  let i = 0;
  const params: SqlParameter[] = [];
  const text = sql.replace(/\?/g, () => {
    const name = `p${i}`;
    params.push({ name, value: jsToField(parameters[i]) });
    i++;
    return `:${name}`;
  });
  return { sql: text, parameters: params };
}

export async function executeSql(sql: string, parameters?: unknown[]): Promise<Record<string, unknown>[]> {
  assertConfigured();
  const { sql: text, parameters: params } = buildParameterizedSql(sql, parameters);
  const out = await rdsClient.send(
    new ExecuteStatementCommand({
      resourceArn: AURORA_CONFIG.resourceArn,
      secretArn: AURORA_CONFIG.secretArn,
      database: AURORA_CONFIG.database,
      sql: text,
      parameters: params,
      includeResultMetadata: true,
    }),
  );
  return formatResult(out);
}

export async function transaction(queries: { sql: string; parameters?: unknown[] }[]): Promise<Record<string, unknown>[][]> {
  assertConfigured();
  const begin = await rdsClient.send(
    new BeginTransactionCommand({
      resourceArn: AURORA_CONFIG.resourceArn,
      secretArn: AURORA_CONFIG.secretArn,
      database: AURORA_CONFIG.database,
    }),
  );
  const transactionId = begin.transactionId;
  if (!transactionId) throw new Error('BeginTransaction did not return transactionId');
  const results: Record<string, unknown>[][] = [];
  try {
    for (const q of queries) {
      const { sql: text, parameters: params } = buildParameterizedSql(q.sql, q.parameters);
      const out = await rdsClient.send(
        new ExecuteStatementCommand({
          resourceArn: AURORA_CONFIG.resourceArn,
          secretArn: AURORA_CONFIG.secretArn,
          database: AURORA_CONFIG.database,
          sql: text,
          parameters: params,
          transactionId,
          includeResultMetadata: true,
        }),
      );
      results.push(formatResult(out));
    }
    await rdsClient.send(
      new CommitTransactionCommand({
        resourceArn: AURORA_CONFIG.resourceArn,
        secretArn: AURORA_CONFIG.secretArn,
        transactionId,
      }),
    );
    return results;
  } catch (e) {
    await rdsClient.send(
      new RollbackTransactionCommand({
        resourceArn: AURORA_CONFIG.resourceArn,
        secretArn: AURORA_CONFIG.secretArn,
        transactionId,
      }),
    );
    throw e;
  }
}

/** Optional helper: run DDL once in a new environment. */
export async function ensureSchema(): Promise<void> {
  const ddl = [
    `CREATE TABLE IF NOT EXISTS risk_assessments (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      risk_score DECIMAL(5,2) NOT NULL,
      factors JSONB NOT NULL,
      model_version VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      proof_commitment VARCHAR(66)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_risk_wallet ON risk_assessments(wallet_address, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS medical_images (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      s3_key VARCHAR(255) NOT NULL,
      image_type VARCHAR(50) NOT NULL,
      metadata JSONB,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      encryption_key_id VARCHAR(100),
      deleted_at TIMESTAMP NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_images_wallet ON medical_images(wallet_address, uploaded_at DESC)`,
    `CREATE TABLE IF NOT EXISTS access_logs (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      accessor_address VARCHAR(42) NOT NULL,
      action VARCHAR(20) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_access_wallet ON access_logs(wallet_address, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS population_stats (
      id SERIAL PRIMARY KEY,
      metric_name VARCHAR(50) NOT NULL,
      metric_value DECIMAL(10,2) NOT NULL,
      demographic_filters JSONB,
      calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sample_size INTEGER NOT NULL
    )`,
  ];
  for (const sql of ddl) {
    await executeSql(sql);
  }
}

export interface RiskAssessmentRecord {
  id: number;
  wallet_address: string;
  risk_score: number;
  factors: Record<string, unknown>;
  model_version: string;
  created_at: string;
  proof_commitment: string | null;
}

export interface ImageRecord {
  id: number;
  wallet_address: string;
  s3_key: string;
  image_type: string;
  metadata: Record<string, unknown> | null;
  uploaded_at: string;
  encryption_key_id: string | null;
  deleted_at?: string | null;
}

export async function storeRiskAssessment(
  walletAddress: string,
  riskScore: number,
  factors: object,
  modelVersion: string,
  proofCommitment?: string | null,
): Promise<number> {
  const wallet = walletAddress.toLowerCase();
  const rows = await executeSql(
    `INSERT INTO risk_assessments (wallet_address, risk_score, factors, model_version, proof_commitment)
     VALUES (?, ?, ?::jsonb, ?, ?) RETURNING id`,
    [wallet, riskScore, JSON.stringify(factors), modelVersion, proofCommitment ?? null],
  );
  const id = rows[0]?.id;
  if (typeof id !== 'number' && typeof id !== 'string') throw new Error('INSERT did not return id');
  return Number(id);
}

export async function getRiskHistory(walletAddress: string, limit = 50): Promise<RiskAssessmentRecord[]> {
  const wallet = walletAddress.toLowerCase();
  const rows = await executeSql(
    `SELECT id, wallet_address, risk_score, factors, model_version, created_at::text AS created_at, proof_commitment
     FROM risk_assessments WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?`,
    [wallet, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    wallet_address: String(r.wallet_address),
    risk_score: Number(r.risk_score),
    factors: (typeof r.factors === 'string' ? JSON.parse(r.factors as string) : r.factors) as Record<string, unknown>,
    model_version: String(r.model_version),
    created_at: String(r.created_at),
    proof_commitment: r.proof_commitment ? String(r.proof_commitment) : null,
  }));
}

export async function getRiskTrend(
  walletAddress: string,
  days: number,
): Promise<{ date: string; avgRisk: number }[]> {
  const wallet = walletAddress.toLowerCase();
  const rows = await executeSql(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
            AVG(risk_score)::float AS avgrisk
     FROM risk_assessments
     WHERE wallet_address = ?
       AND created_at >= (CURRENT_TIMESTAMP - (?::int * INTERVAL '1 day'))
     GROUP BY 1 ORDER BY 1`,
    [wallet, days],
  );
  return rows.map((r) => ({
    date: String(r.date),
    avgRisk: Number((r as Record<string, unknown>)['avgrisk'] ?? 0),
  }));
}

export async function getPopulationStats(
  metric: string,
  filters?: object,
): Promise<{ percentile: number; value: number }[]> {
  const filterJson = filters ? JSON.stringify(filters) : null;
  let sql = `SELECT metric_value FROM population_stats WHERE metric_name = ?`;
  const params: unknown[] = [metric];
  if (filterJson) {
    sql += ` AND (demographic_filters @> ?::jsonb OR demographic_filters IS NULL)`;
    params.push(filterJson);
  }
  sql += ' ORDER BY metric_value';
  const rows = await executeSql(sql, params);
  const n = rows.length;
  return rows.map((r, i) => ({
    percentile: n <= 1 ? 50 : Math.round(((i + 1) / Math.max(n, 1)) * 100),
    value: Number(r.metric_value),
  }));
}

export async function storeImageMetadata(
  walletAddress: string,
  s3Key: string,
  imageType: string,
  metadata: object,
  encryptionKeyId?: string | null,
): Promise<string> {
  const wallet = walletAddress.toLowerCase();
  const rows = await executeSql(
    `INSERT INTO medical_images (wallet_address, s3_key, image_type, metadata, encryption_key_id)
     VALUES (?, ?, ?, ?::jsonb, ?) RETURNING id`,
    [wallet, s3Key, imageType, JSON.stringify(metadata), encryptionKeyId ?? null],
  );
  return String(rows[0]?.id ?? '');
}

export async function getPatientImages(walletAddress: string): Promise<ImageRecord[]> {
  const wallet = walletAddress.toLowerCase();
  const rows = await executeSql(
    `SELECT id, wallet_address, s3_key, image_type, metadata, uploaded_at::text AS uploaded_at,
            encryption_key_id, deleted_at::text AS deleted_at
     FROM medical_images
     WHERE wallet_address = ? AND deleted_at IS NULL
     ORDER BY uploaded_at DESC`,
    [wallet],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    wallet_address: String(r.wallet_address),
    s3_key: String(r.s3_key),
    image_type: String(r.image_type),
    metadata: r.metadata
      ? ((typeof r.metadata === 'string' ? JSON.parse(r.metadata as string) : r.metadata) as Record<string, unknown>)
      : null,
    uploaded_at: String(r.uploaded_at),
    encryption_key_id: r.encryption_key_id ? String(r.encryption_key_id) : null,
    deleted_at: r.deleted_at != null && r.deleted_at !== '' ? String(r.deleted_at) : null,
  }));
}

export async function markImageDeleted(recordId: string): Promise<void> {
  await executeSql(`UPDATE medical_images SET deleted_at = NOW() WHERE id = ?`, [Number(recordId)]);
}

export async function getImageRecordById(recordId: number): Promise<ImageRecord | null> {
  const rows = await executeSql(
    `SELECT id, wallet_address, s3_key, image_type, metadata, uploaded_at::text AS uploaded_at,
            encryption_key_id, deleted_at::text AS deleted_at
     FROM medical_images WHERE id = ?`,
    [recordId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    wallet_address: String(r.wallet_address),
    s3_key: String(r.s3_key),
    image_type: String(r.image_type),
    metadata: r.metadata
      ? ((typeof r.metadata === 'string' ? JSON.parse(r.metadata as string) : r.metadata) as Record<string, unknown>)
      : null,
    uploaded_at: String(r.uploaded_at),
    encryption_key_id: r.encryption_key_id ? String(r.encryption_key_id) : null,
    deleted_at: r.deleted_at != null && r.deleted_at !== '' ? String(r.deleted_at) : null,
  };
}

export async function getImageRecordByS3Key(s3Key: string): Promise<ImageRecord | null> {
  const rows = await executeSql(
    `SELECT id, wallet_address, s3_key, image_type, metadata, uploaded_at::text AS uploaded_at,
            encryption_key_id, deleted_at::text AS deleted_at
     FROM medical_images WHERE s3_key = ? AND deleted_at IS NULL LIMIT 1`,
    [s3Key],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    wallet_address: String(r.wallet_address),
    s3_key: String(r.s3_key),
    image_type: String(r.image_type),
    metadata: r.metadata
      ? ((typeof r.metadata === 'string' ? JSON.parse(r.metadata as string) : r.metadata) as Record<string, unknown>)
      : null,
    uploaded_at: String(r.uploaded_at),
    encryption_key_id: r.encryption_key_id ? String(r.encryption_key_id) : null,
    deleted_at: r.deleted_at != null && r.deleted_at !== '' ? String(r.deleted_at) : null,
  };
}

export async function logAccessEvent(
  walletAddress: string,
  accessor: string,
  action: string,
  resourceType: string,
  details: object,
): Promise<void> {
  await executeSql(
    `INSERT INTO access_logs (wallet_address, accessor_address, action, resource_type, details)
     VALUES (?, ?, ?, ?, ?::jsonb)`,
    [
      walletAddress.toLowerCase(),
      accessor.toLowerCase(),
      action,
      resourceType,
      JSON.stringify(details),
    ],
  );
}
