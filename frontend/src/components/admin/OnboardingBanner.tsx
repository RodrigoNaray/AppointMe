import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle, Sparkles, X } from 'lucide-react';
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
  const { t } = useTranslation('admin');
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

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="font-semibold text-base sm:text-lg">
                  {t('onboarding.banner.title')}
                </h2>
                {!dismissed && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('onboarding.banner.subtitle')}
                  </p>
                )}
                {dismissed && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('onboarding.banner.dismissedHint')}
                  </p>
                )}
              </div>
            </div>
            {dismissed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={dismiss}
                className="h-8 w-8 flex-shrink-0"
                aria-label={t('onboarding.cta.dismiss')}
                disabled
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ul className="space-y-1.5">
            <ChecklistItem label={t('onboarding.check.schedule')} done={hasSchedule} />
            <ChecklistItem label={t('onboarding.check.category')} done={hasCategories} />
            <ChecklistItem label={t('onboarding.check.service')} done={hasServices} />
          </ul>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              onClick={() => setWizardOpen(true)}
              className="w-full sm:w-auto"
              size="sm"
            >
              {t('onboarding.cta.start')}
            </Button>
            {!dismissed && (
              <Button
                onClick={dismiss}
                variant="ghost"
                className="w-full sm:w-auto"
                size="sm"
              >
                {t('onboarding.cta.dismiss')}
              </Button>
            )}
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
