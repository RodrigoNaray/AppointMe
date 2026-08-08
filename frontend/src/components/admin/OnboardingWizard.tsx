import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  selectMarkCompleted,
  useOnboardingStore,
} from '@/stores/onboardingStore';

export type WizardStepId =
  | 'welcome'
  | 'availability'
  | 'category'
  | 'service'
  | 'rules'
  | 'contact'
  | 'done';

export interface OnboardingStep {
  id: WizardStepId;
  path?: string;
  cta: string;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'availability',
    path: '/admin/availability',
    cta: 'Configurar horario',
    title: 'Paso 1: Horario semanal',
    description: 'Definí qué días y horarios atendés. Los días no marcados se considerarán no laborables.',
  },
  {
    id: 'category',
    path: '/admin/categories',
    cta: 'Crear categoría',
    title: 'Paso 2: Primera categoría',
    description: 'Las categorías agrupan tus servicios (por ejemplo: "Cortes", "Coloración").',
  },
  {
    id: 'service',
    path: '/admin/services',
    cta: 'Crear servicio',
    title: 'Paso 3: Primer servicio',
    description: 'Los servicios son lo que reservan tus clientes (con duración y precio).',
  },
  {
    id: 'rules',
    path: '/admin/settings',
    cta: 'Configurar reglas',
    title: 'Paso 4: Reglas de reserva',
    description: 'Configurá la anticipación mínima para reservar y para cancelar.',
  },
  {
    id: 'contact',
    path: '/admin/settings',
    cta: 'Configurar contacto',
    title: 'Paso 5: Información de contacto',
    description: 'Teléfono, email, dirección y ubicación en el mapa para que los clientes te encuentren.',
  },
];

const TOTAL_PROGRESS_STEPS = STEPS.length + 1;

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStepFinished: () => Promise<void> | void;
}

export default function OnboardingWizard({
  open,
  onOpenChange,
  onStepFinished,
}: OnboardingWizardProps) {
  const navigate = useNavigate();
  const markCompleted = useOnboardingStore(selectMarkCompleted);
  const [stepIndex, setStepIndex] = useState(-1);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => setStepIndex(-1), 200);
    }
  };

  const handleNext = () => setStepIndex((i) => i + 1);
  const handleBack = () => setStepIndex((i) => Math.max(-1, i - 1));

  const handleGoToStep = async (path: string) => {
    await onStepFinished();
    handleOpenChange(false);
    navigate(path);
  };

  const renderWelcome = () => (
    <>
      <DialogHeader>
        <DialogTitle>Bienvenido a AppointMePro</DialogTitle>
        <DialogDescription>Vamos a configurar tu cuenta en 5 pasos. Podés cerrar este wizard y retomar cuando quieras.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={handleNext} className="w-full sm:w-auto">
          Iniciar configuración guiada
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogFooter>
    </>
  );

  const renderDone = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          ¡Listo!
        </DialogTitle>
        <DialogDescription>Tu cuenta ya está operativa. Podés seguir configurando desde el menú lateral.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          onClick={async () => {
            markCompleted();
            await onStepFinished();
            handleOpenChange(false);
          }}
          className="w-full sm:w-auto"
        >
          Continuar
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep = (step: OnboardingStep) => (
    <>
      <DialogHeader>
        <DialogTitle>{step.title}</DialogTitle>
        <DialogDescription>{step.description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="w-full sm:w-auto sm:mr-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        {step.path && (
          <Button
            onClick={() => handleGoToStep(step.path)}
            className="w-full sm:w-auto"
          >
            {step.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleNext}
          className="w-full sm:w-auto"
        >
          Saltar este paso
        </Button>
      </DialogFooter>
    </>
  );

  const isWelcome = stepIndex === -1;
  const isDone = stepIndex === STEPS.length;
  const currentStep = !isWelcome && !isDone ? STEPS[stepIndex] : null;
  const progress = Math.min(
    100,
    Math.max(0, ((stepIndex + 1) / TOTAL_PROGRESS_STEPS) * 100)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md max-h-[90vh] overflow-y-auto"
        data-testid="onboarding-wizard"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Configuración inicial
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.min(stepIndex + 1, TOTAL_PROGRESS_STEPS)}/{TOTAL_PROGRESS_STEPS}
            </p>
          </div>
          <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
              data-testid="onboarding-progress"
            />
          </div>

          {isWelcome && renderWelcome()}
          {currentStep && renderStep(currentStep)}
          {isDone && renderDone()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
