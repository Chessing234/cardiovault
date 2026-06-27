import { existsSync, mkdirSync } from 'fs';
import path from 'path';

import { FaissStore } from '@langchain/community/vectorstores/faiss';
import type { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';

import { RAG_CONFIG } from './rag-config';

let vectorStore: FaissStore | null = null;
let embeddings: OpenAIEmbeddings | null = null;

function indexExists(dir: string): boolean {
  return existsSync(path.join(dir, 'faiss.index'));
}

export function initEmbeddings(): OpenAIEmbeddings {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: RAG_CONFIG.openaiApiKey,
      model: 'text-embedding-3-small',
    });
  }
  return embeddings;
}

export async function loadVectorStoreFromDisk(): Promise<boolean> {
  if (vectorStore) return true;

  const dir = RAG_CONFIG.vectorStorePath;
  mkdirSync(dir, { recursive: true });

  if (!indexExists(dir)) return false;

  const embedder = initEmbeddings();
  vectorStore = await FaissStore.load(dir, embedder);
  return true;
}

export async function createVectorStoreFromDocuments(docs: Document[]): Promise<void> {
  const dir = RAG_CONFIG.vectorStorePath;
  mkdirSync(dir, { recursive: true });

  const embedder = initEmbeddings();
  vectorStore = await FaissStore.fromDocuments(docs, embedder);
  await vectorStore.save(dir);
}

export async function getVectorStore(): Promise<FaissStore> {
  if (vectorStore) return vectorStore;

  const loaded = await loadVectorStoreFromDisk();
  if (!loaded) {
    throw new Error(
      'Vector store is not initialized yet. Call `ensureMedicalKbIndexed()` during server startup or before chat.',
    );
  }

  return vectorStore!;
}

export async function addDocuments(docs: Document[]): Promise<void> {
  if (docs.length === 0) return;

  const dir = RAG_CONFIG.vectorStorePath;
  mkdirSync(dir, { recursive: true });

  if (!vectorStore) {
    const embedder = initEmbeddings();
    if (indexExists(dir)) {
      vectorStore = await FaissStore.load(dir, embedder);
      await vectorStore.addDocuments(docs);
    } else {
      vectorStore = await FaissStore.fromDocuments(docs, embedder);
    }
  } else {
    await vectorStore.addDocuments(docs);
  }

  await vectorStore.save(dir);
}

export async function searchDocuments(query: string, k: number = RAG_CONFIG.topK): Promise<Document[]> {
  const store = await getVectorStore();
  return store.similaritySearch(query, k);
}

export async function resetVectorStore(): Promise<void> {
  const embedder = initEmbeddings();
  vectorStore = new FaissStore(embedder, {});

  const dir = RAG_CONFIG.vectorStorePath;
  mkdirSync(dir, { recursive: true });
  await vectorStore.save(dir);
}

export function __dangerouslySetVectorStoreForTests(store: FaissStore | null) {
  vectorStore = store;
}
