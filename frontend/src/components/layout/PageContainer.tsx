import { cn } from "@/lib/utils";

interface PageContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  fullHeight?: boolean;
  centered?: boolean;
  padding?: 'normal' | 'large' | 'none';
  className?: string;
  children: React.ReactNode;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
};

export function PageContainer({
  maxWidth = '4xl',
  fullHeight = false,
  centered = false,
  padding = 'normal',
  className,
  children,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'bg-background w-full',
        fullHeight && 'min-h-screen',
        centered && 'flex items-center justify-center',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto w-full',
          maxWidthMap[maxWidth],
          padding === 'normal' && 'px-4 sm:px-6 py-8 sm:py-12',
          padding === 'large' && 'px-4 sm:px-6 py-12 sm:py-16',
          padding === 'none' && '',
        )}
      >
        {children}
      </div>
    </div>
  );
}
