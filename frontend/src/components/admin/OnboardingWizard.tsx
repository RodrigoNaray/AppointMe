import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  ctaKey: string;
  titleKey: string;
  descriptionKey: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'availability',
    path: '/admin/availability',
    ctaKey: 'onboarding.wizard.step.availability.cta',
    titleKey: 'onboarding.wizard.step.availability.title',
    descriptionKey: 'onboarding.wizard.step.availability.description',
  },
  {
    id: 'category',
    path: '/admin/categories',
    ctaKey: 'onboarding.wizard.step.category.cta',
    titleKey: 'onboarding.wizard.step.category.title',
    descriptionKey: 'onboarding.wizard.step.category.description',
  },
  {
    id: 'service',
    path: '/admin/services',
    ctaKey: 'onboarding.wizard.step.service.cta',
    titleKey: 'onboarding.wizard.step.service.title',
    descriptionKey: 'onboarding.wizard.step.service.description',
  },
  {
    id: 'rules',
    path: '/admin/settings',
    ctaKey: 'onboarding.wizard.step.rules.cta',
    titleKey: 'onboarding.wizard.step.rules.title',
    descriptionKey: 'onboarding.wizard.step.rules.description',
  },
  {
    id: 'contact',
    path: '/admin/settings',
    ctaKey: 'onboarding.wizard.step.contact.cta',
    titleKey: 'onboarding.wizard.step.contact.title',
    descriptionKey: 'onboarding.wizard.step.contact.description',
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
  const { t } = useTranslation('admin');
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
        <DialogTitle>{t('onboarding.wizard.welcome.title')}</DialogTitle>
        <DialogDescription>{t('onboarding.wizard.welcome.body')}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={handleNext} className="w-full sm:w-auto">
          {t('onboarding.cta.start')}
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
          {t('onboarding.wizard.done.title')}
        </DialogTitle>
        <DialogDescription>{t('onboarding.wizard.done.body')}</DialogDescription>
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
          {t('onboarding.wizard.continue')}
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep = (step: OnboardingStep) => (
    <>
      <DialogHeader>
        <DialogTitle>{t(step.titleKey)}</DialogTitle>
        <DialogDescription>{t(step.descriptionKey)}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="w-full sm:w-auto sm:mr-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('onboarding.wizard.back')}
        </Button>
        {step.path && (
          <Button
            onClick={() => handleGoToStep(step.path)}
            className="w-full sm:w-auto"
          >
            {t(step.ctaKey)}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleNext}
          className="w-full sm:w-auto"
        >
          {t('onboarding.wizard.skip')}
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
              {t('onboarding.wizard.title')}
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
