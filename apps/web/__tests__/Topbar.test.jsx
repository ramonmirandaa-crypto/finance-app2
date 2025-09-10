import { render, screen } from '@testing-library/react';
import Topbar from '../components/Topbar';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

describe('Topbar', () => {
  it('exibe saudação do usuário', () => {
    render(<Topbar user={{ name: 'Ramon' }} />);
    expect(screen.getByText('Finance App')).toBeInTheDocument();
    expect(screen.getByText(/Olá, Ramon/)).toBeInTheDocument();
  });
});
