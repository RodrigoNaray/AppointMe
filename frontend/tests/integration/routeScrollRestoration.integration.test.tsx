import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublicLayout from '../../src/layouts/PublicLayout';
import AdminLayout from '../../src/layouts/AdminLayout';

function HomePageWithContactLink() {
  return <Link to="/contact">Ir a contacto</Link>;
}

function AdminHomeWithServicesLink() {
  return <Link to="/admin/services">Ir a servicios admin</Link>;
}

function ContactPageWithBackButton() {
  const navigate = useNavigate();

  return (
    <div>
      <p>Contact page</p>
      <button type="button" onClick={() => navigate(-1)}>
        Volver
      </button>
    </div>
  );
}

describe('Route scroll restoration', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
  });

  it('scrolls to top on public push navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePageWithContactLink />} />
            <Route path="contact" element={<div>Contact page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(window.scrollTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Ir a contacto' }));

    await waitFor(() => {
      expect(screen.getByText('Contact page')).toBeTruthy();
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  it('scrolls to top on admin push navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHomeWithServicesLink />} />
            <Route path="services" element={<div>Admin services</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(window.scrollTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Ir a servicios admin' }));

    await waitFor(() => {
      expect(screen.getByText('Admin services')).toBeTruthy();
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  it('does not force scroll on POP navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/', '/contact']} initialIndex={1}>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<div>Home page</div>} />
            <Route path="contact" element={<ContactPageWithBackButton />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Contact page')).toBeTruthy();
    });

    expect(window.scrollTo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    await waitFor(() => {
      expect(screen.getByText('Home page')).toBeTruthy();
    });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
