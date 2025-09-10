import { render, screen } from '@testing-library/react';
import LoginPage from '../app/login/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

describe('LoginPage', () => {
  it('renderiza formulário de login', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/senha/i)).toBeInTheDocument();
  });
});
