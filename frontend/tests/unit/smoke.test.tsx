import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('frontend test setup', () => {
  it('renders a simple node with testing-library', () => {
    render(<div>AppointMe test smoke</div>);

    expect(screen.getByText('AppointMe test smoke')).toBeInTheDocument();
  });
});
