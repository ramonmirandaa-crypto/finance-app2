import { render, screen } from '@testing-library/react';
import RegisterPage from '../app/register/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

describe('RegisterPage', () => {
  it('renderiza formulário de registro', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /criar conta/i })).toBeInTheDocument();
    expect(screen.getByText(/nome/i)).toBeInTheDocument();
    expect(screen.getByText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/senha/i)).toBeInTheDocument();
  });
});
