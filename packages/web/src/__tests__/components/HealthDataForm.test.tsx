import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthDataForm } from '@/components/health/HealthDataForm';

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

describe('HealthDataForm', () => {
  it('renders key numeric placeholders', () => {
    render(<HealthDataForm />);
    expect(screen.getByPlaceholderText('35')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('175')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('120')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('200')).toBeInTheDocument();
  });

  it('renders risk factor labels', () => {
    render(<HealthDataForm />);
    expect(screen.getByText('Smoker')).toBeInTheDocument();
    expect(screen.getByText('Diabetic')).toBeInTheDocument();
    expect(screen.getByText('Family history')).toBeInTheDocument();
  });

  it('exposes calculate risk score action', () => {
    render(<HealthDataForm />);
    expect(screen.getByRole('button', { name: /calculate risk score/i })).toBeInTheDocument();
  });

  it('accepts typed age and systolic BP', async () => {
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
