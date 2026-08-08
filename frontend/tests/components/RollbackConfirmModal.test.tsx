import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RollbackConfirmModal, type RollbackItem } from '@/components/booking/RollbackConfirmModal';

const makeSuccessItem = (id: string, name: string): RollbackItem => ({
  serviceId: id,
  serviceName: name,
  success: true,
  bookingId: `booking-${id}`,
});

const makeFailedItem = (id: string, name: string, error?: string): RollbackItem => ({
  serviceId: id,
  serviceName: name,
  success: false,
  error: error ?? 'Conflict',
});

describe('RollbackConfirmModal', () => {
  it('renders successful and failed service lists', () => {
    render(
      <RollbackConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        successfulItems={[makeSuccessItem('s1', 'Corte'), makeSuccessItem('s2', 'Barba')]}
        failedItems={[makeFailedItem('f1', 'Tinte', 'Horario no disponible')]}
        onRollback={vi.fn()}
        onKeepPartial={vi.fn()}
      />
    );

    expect(screen.getByText('Corte')).toBeTruthy();
    expect(screen.getByText('Barba')).toBeTruthy();
    expect(screen.getByText('Tinte')).toBeTruthy();
    expect(screen.getByText(/Horario no disponible/)).toBeTruthy();
  });

  it('shows correct counts in description', () => {
    render(
      <RollbackConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        successfulItems={[makeSuccessItem('s1', 'Corte')]}
        failedItems={[makeFailedItem('f1', 'Tinte')]}
        onRollback={vi.fn()}
        onKeepPartial={vi.fn()}
      />
    );

    expect(screen.getByText(/1 de 2 servicios/)).toBeTruthy();
  });

  it('calls onRollback when confirm button is clicked', async () => {
    const onRollback = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <RollbackConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        successfulItems={[makeSuccessItem('s1', 'Corte')]}
        failedItems={[makeFailedItem('f1', 'Tinte')]}
        onRollback={onRollback}
        onKeepPartial={vi.fn()}
      />
    );

    await user.click(screen.getByText('Sí, cancelar y reintentar'));
    expect(onRollback).toHaveBeenCalledTimes(1);
  });

  it('calls onKeepPartial when closed without rollback', async () => {
    const onKeepPartial = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RollbackConfirmModal
        open={true}
        onOpenChange={onOpenChange}
        successfulItems={[makeSuccessItem('s1', 'Corte')]}
        failedItems={[makeFailedItem('f1', 'Tinte')]}
        onRollback={vi.fn()}
        onKeepPartial={onKeepPartial}
      />
    );

      await user.click(screen.getAllByRole('button', { name: 'Cerrar' })[1]);
    expect(onKeepPartial).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows success message after rollback completes', async () => {
    const onRollback = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <RollbackConfirmModal
        open={true}
        onOpenChange={vi.fn()}
        successfulItems={[makeSuccessItem('s1', 'Corte')]}
        failedItems={[makeFailedItem('f1', 'Tinte')]}
        onRollback={onRollback}
        onKeepPartial={vi.fn()}
      />
    );

    await user.click(screen.getByText('Sí, cancelar y reintentar'));
    expect(await screen.findByText('Reservas canceladas correctamente. Podés reintentar cuando quieras.')).toBeTruthy();
  });
});
