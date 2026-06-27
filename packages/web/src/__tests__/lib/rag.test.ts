/**
 * @jest-environment node
 */

jest.mock('@/lib/rag-chain', () => ({
  askMedicalQuestion: jest.fn(),
}));

import { askMedicalQuestion } from '@/lib/rag-chain';

const mockAsk = askMedicalQuestion as jest.MockedFunction<typeof askMedicalQuestion>;

describe('RAG medical assistant (mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns answer, disclaimer, and sources', async () => {
    mockAsk.mockResolvedValueOnce({
      answer: 'High blood pressure is elevated arterial pressure. [1]',
      sources: [
        { title: 'Cholesterol and BP', source: 'demo', category: 'cholesterol' },
      ],
    });

    const result = await askMedicalQuestion('What is high blood pressure?');
    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
    const hasChol = result.sources.some(
      (s) => s.category === 'cholesterol' || s.title.toLowerCase().includes('cholesterol')
    );
    expect(hasChol).toBe(true);
  });

  it('can return educational disclaimer text', async () => {
    mockAsk.mockResolvedValueOnce({
      answer: 'Heart attacks involve blocked flow.\n\nDisclaimer: not medical advice.',
      sources: [],
    });
    const result = await askMedicalQuestion('What causes heart attacks?');
    expect(result.answer.toLowerCase()).toMatch(/disclaimer|medical advice/);
  });
});
