import { useState } from 'react';
import { Check, Circle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import {
  selectDismiss,
  selectDismissed,
  useOnboardingStore,
} from '@/stores/onboardingStore';
import OnboardingWizard from './OnboardingWizard';

interface ChecklistItemProps {
  label: string;
  done: boolean;
}

const ChecklistItem = ({ label, done }: ChecklistItemProps) => (
  <li className="flex items-center gap-2 text-sm">
    {done ? (
      <Check className="h-4 w-4 text-primary flex-shrink-0" aria-label="done" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-label="pending" />
    )}
    <span className={done ? 'line-through text-muted-foreground' : 'text-foreground'}>
      {label}
    </span>
  </li>
);

export default function OnboardingBanner() {
  const { hasSchedule, hasCategories, hasServices, needsOnboarding, isLoading, refetch } =
    useOnboardingStatus();
  const dismissed = useOnboardingStore(selectDismissed);
  const dismiss = useOnboardingStore(selectDismiss);
  const [wizardOpen, setWizardOpen] = useState(false);

  if (isLoading || !needsOnboarding) return null;

  const handleStepFinished = async () => {
    setWizardOpen(false);
    await refetch();
  };

  if (dismissed) {
    return (
      <>
        <button
          onClick={() => setWizardOpen(true)}
          className="text-sm text-muted-foreground hover:text-primary underline transition-colors text-left"
        >
          Volver al wizard →
        </button>
        <OnboardingWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onStepFinished={handleStepFinished}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="font-semibold text-base sm:text-lg">
                  Tu cuenta aún no está lista para recibir reservas
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Completá estos pasos para empezar a recibir clientes.
                </p>
              </div>
            </div>
          </div>

          <ul className="space-y-1.5">
            <ChecklistItem label="Horario semanal configurado" done={hasSchedule} />
            <ChecklistItem label="Al menos una categoría creada" done={hasCategories} />
            <ChecklistItem label="Al menos un servicio activo" done={hasServices} />
          </ul>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              onClick={() => setWizardOpen(true)}
              className="w-full sm:w-auto"
              size="sm"
            >
              Iniciar configuración guiada
            </Button>
            <Button
              onClick={dismiss}
              variant="ghost"
              className="w-full sm:w-auto"
              size="sm"
            >
              Omitir por ahora
            </Button>
          </div>
        </CardContent>
      </Card>

      <OnboardingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onStepFinished={handleStepFinished}
      />
    </>
  );
}
