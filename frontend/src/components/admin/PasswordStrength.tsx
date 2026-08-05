import { cn } from '@/lib/utils';

type PasswordStrengthProps = { value: string };

const levels = [
  { label: 'Muy débil', bars: 1, color: 'bg-destructive' },
  { label: 'Débil', bars: 2, color: 'bg-warning' },
  { label: 'Regular', bars: 3, color: 'bg-warning' },
  { label: 'Fuerte', bars: 4, color: 'bg-success' },
];

function calcScore(value: string): number {
  if (value.length < 8) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (/\d/.test(value)) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 3);
}

export function PasswordStrength({ value }: PasswordStrengthProps) {
  if (!value) return null;
  const level = levels[calcScore(value)];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i <= level.bars ? level.color : 'bg-muted')}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{level.label}</p>
    </div>
  );
}
