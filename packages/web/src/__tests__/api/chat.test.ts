/**
 * @jest-environment node
 */

jest.mock('@/lib/rag-chain', () => ({
  askMedicalQuestion: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST as postChat } from '@/app/api/chat/route';
import { askMedicalQuestion } from '@/lib/rag-chain';

const mockAsk = askMedicalQuestion as jest.MockedFunction<typeof askMedicalQuestion>;

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsk.mockResolvedValue({
      answer: 'Test answer with disclaimer.',
      sources: [{ title: 'Guide', source: 'kb', category: 'general' }],
    });
  });

  it('returns answer and sources', async () => {
    const response = await postChat(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is hypertension?' }),
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as { answer: string; sources: unknown[] };
    expect(data.answer).toContain('Test answer');
    expect(Array.isArray(data.sources)).toBe(true);
  });

  it('rejects empty message', async () => {
    const response = await postChat(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: '   ' }),
        headers: { 'content-type': 'application/json' },
      })
    );
    expect(response.status).toBe(400);
  });
});
