import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../src/components/ui/pagination';

describe('Pagination components', () => {
  it('renders navigation primitives correctly', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#prev" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );

    const nav = screen.getByRole('navigation', { name: 'pagination' });
    const previous = screen.getByRole('link', { name: 'Go to previous page' });
    const next = screen.getByRole('link', { name: 'Go to next page' });
    const active = screen.getByRole('link', { current: 'page' });

    expect(nav).toBeTruthy();
    expect(previous).toBeTruthy();
    expect(next).toBeTruthy();
    expect(active.textContent).toContain('1');
  });

  it('honors explicit size override for previous/next controls', () => {
    render(
      <>
        <PaginationPrevious href="#prev" size="icon" data-testid="prev" />
        <PaginationNext href="#next" size="icon" data-testid="next" />
      </>
    );

    expect(screen.getByTestId('prev').className).toContain('size-9');
    expect(screen.getByTestId('next').className).toContain('size-9');
  });
});
