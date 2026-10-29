import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('T-01.8 – frontend vazio', () => {
  it('renderiza o título', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SAFE' })).toBeInTheDocument();
  });
});
