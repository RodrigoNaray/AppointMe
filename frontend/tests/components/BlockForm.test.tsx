import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BlockForm from '@/components/BlockForm';

describe('BlockForm', () => {
  it('renders empty fields by default', () => {
    render(<BlockForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Inicio del bloqueo')).toBeTruthy();
    expect(screen.getByLabelText('Fin del bloqueo')).toBeTruthy();
    expect(screen.getByLabelText('Motivo (opcional)')).toBeTruthy();
  });

  it('pre-fills start and end time when default props are provided', () => {
    render(
      <BlockForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        defaultStartTime="2030-06-15T10:00"
        defaultEndTime="2030-06-15T11:00"
      />
    );
    const startInput = screen.getByLabelText('Inicio del bloqueo') as HTMLInputElement;
    const endInput = screen.getByLabelText('Fin del bloqueo') as HTMLInputElement;
    expect(startInput.value).toBe('2030-06-15T10:00');
    expect(endInput.value).toBe('2030-06-15T11:00');
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<BlockForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('submits form data with reason', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <BlockForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultStartTime="2030-06-15T10:00"
        defaultEndTime="2030-06-15T11:00"
      />
    );
    const reasonInput = screen.getByLabelText('Motivo (opcional)');
    await user.type(reasonInput, 'Vacaciones');
    await user.click(screen.getByText('Guardar Bloqueo'));
    expect(onSubmit).toHaveBeenCalledWith({
      startTime: '2030-06-15T10:00',
      endTime: '2030-06-15T11:00',
      reason: 'Vacaciones',
    });
  });

  it('validates end time is after start time', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <BlockForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        defaultStartTime="2030-06-15T11:00"
        defaultEndTime="2030-06-15T10:00"
      />
    );
    await user.click(screen.getByText('Guardar Bloqueo'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
