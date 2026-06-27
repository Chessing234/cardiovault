import path from 'path';

/**
 * RAG (Retrieval-Augmented Generation) configuration for CardioVault's medical assistant.
 *
 * Embeddings default to OpenAI `text-embedding-3-small` (see `vector-store.ts`) for quality + simplicity on
 * Node.js. The `embeddingModel` field documents the *conceptual* Sentence-Transformers baseline used in offline
 * research workflows (`all-MiniLM-L6-v2` @ 384-d).
 */
export const RAG_CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 800,

  embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
  embeddingDimension: 384,
  chunkSize: 512,
  chunkOverlap: 100,
  topK: 5,

  vectorStorePath:
    process.env.VECTOR_STORE_PATH ?? path.join(process.cwd(), 'data', 'vector-store'),

  systemPrompt: `You are CardioVault's medical assistant, an expert in cardiovascular health.
You answer questions based ONLY on the provided medical literature excerpts.
For every claim you make, cite the source using [1], [2], etc.
If the provided excerpts don't contain enough information, say so honestly.
Always include a disclaimer that you're not a substitute for professional medical advice.
Keep responses concise (under 200 words) and medically accurate.`,

  disclaimer:
    '\n\n---\n*Disclaimer: This information is for educational purposes only and is not a substitute for professional medical advice. Always consult a healthcare provider for personal medical decisions.*',
} as const;

export const MEDICAL_CATEGORIES = [
  'hypertension',
  'cholesterol',
  'heart_failure',
  'arrhythmia',
  'coronary_artery_disease',
  'stroke_prevention',
  'lifestyle_modification',
  'medication',
  'diagnostics',
  'prevention',
] as const;

export type MedicalCategory = (typeof MEDICAL_CATEGORIES)[number];
