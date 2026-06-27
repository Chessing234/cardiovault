import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    walletAddress: '0x1234567890123456789012345678901234567890',
    isAuthenticated: true,
    isLoading: false,
  }),
}));

jest.mock('@/lib/risk-model', () => ({
  ...jest.requireActual('@/lib/risk-model'),
  generateRiskSalt: () => '4242424242',
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      id: 1,
      riskPercent: 12,
      riskScoreInt: 12,
      modelVersion: 'framingham-zk-v1',
      vitals: {},
      salt: '4242424242',
    }),
  }),
) as jest.Mock;

import { HealthDataForm } from '@/components/health/HealthDataForm';

describe('CardioVault health data flow (UI)', () => {
  it('health data form accepts numeric inputs', async () => {
    const user = userEvent.setup();
    render(<HealthDataForm />);

    const ageInput = screen.getByPlaceholderText('35');
    await user.clear(ageInput);
    await user.type(ageInput, '45');
    expect(ageInput).toHaveValue(45);

    const bpInput = screen.getByPlaceholderText('120');
    await user.clear(bpInput);
    await user.type(bpInput, '130');
    expect(bpInput).toHaveValue(130);
  });
});
