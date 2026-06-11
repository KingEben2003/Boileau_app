import { render, screen } from '@testing-library/react';
import App from './App';

test("l'application se rend sans erreur", () => {
  render(<App />);
  expect(screen.getByText(/Transformer vos PDFs/i)).toBeInTheDocument();
});
