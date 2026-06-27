import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import type { Document } from '@langchain/core/documents';
import { ChatOpenAI } from '@langchain/openai';

import { ensureMedicalKbIndexed } from './medical-kb';
import { RAG_CONFIG } from './rag-config';
import { searchDocuments } from './vector-store';

const RAG_PROMPT_TEMPLATE = `${RAG_CONFIG.systemPrompt}

## Context (Medical Literature Excerpts)
{context}

## User Question
{question}

Instructions:
- Answer based only on the provided numbered excerpts.
- Cite using [1], [2], etc., matching excerpt numbers.
- Keep your response under 200 words.
- If the excerpts don't contain enough information, say: "I don't have specific information about that in my current medical database."
- Include a brief reminder that this is educational information, not personal medical advice.

Response:`;

const ragPrompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

export function formatDocumentsForPrompt(docs: Document[]): string {
  return docs
    .map((doc, i) => {
      const title = String(doc.metadata.title ?? 'Unknown title');
      const source = String(doc.metadata.source ?? 'Unknown source');
      return `[${i + 1}] (${title} — ${source})\n${doc.pageContent}`;
    })
    .join('\n\n');
}

function dedupeSources(docs: Document[]) {
  return [
    ...new Map(
      docs.map((d) => {
        const title = String(d.metadata.title ?? 'Unknown title');
        const source = String(d.metadata.source ?? 'Unknown source');
        const category = String(d.metadata.category ?? 'general');
        const key = `${title}::${source}`;
        return [key, { title, source, category }] as const;
      }),
    ).values(),
  ];
}

export function createRagGenerationChain() {
  const llm = new ChatOpenAI({
    openAIApiKey: RAG_CONFIG.openaiApiKey,
    model: RAG_CONFIG.modelName,
    temperature: RAG_CONFIG.temperature,
    maxTokens: RAG_CONFIG.maxTokens,
  });

  return RunnableSequence.from([ragPrompt, llm, new StringOutputParser()]);
}

let ragChain: ReturnType<typeof createRagGenerationChain> | null = null;

export function getRAGChain() {
  ragChain = ragChain ?? createRagGenerationChain();
  return ragChain;
}

export async function askMedicalQuestion(question: string): Promise<{
  answer: string;
  sources: { title: string; source: string; category: string }[];
}> {
  if (!RAG_CONFIG.openaiApiKey.trim()) {
    return {
      answer:
        'The assistant is not configured (missing `OPENAI_API_KEY` on the server). Add a key to enable retrieval + generation.' +
        RAG_CONFIG.disclaimer,
      sources: [],
    };
  }

  await ensureMedicalKbIndexed();

  const docs = await searchDocuments(question, RAG_CONFIG.topK);
  const context = formatDocumentsForPrompt(docs);
  const sources = dedupeSources(docs);

  const chain = getRAGChain();

  let answer: string;
  try {
    answer = await chain.invoke({ context, question });
  } catch {
    answer =
      'I apologize — I could not generate a response right now (LLM or embedding error). Please try again in a moment.';
  }

  return { answer: `${answer}${RAG_CONFIG.disclaimer}`, sources };
}
