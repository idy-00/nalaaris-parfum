import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Interrupteur « Rose & blanc » / « Noir & rose », toujours visible dans le header (mobile et desktop).
 * La pastille suit le thème en CSS (`dark:`) : bonne position dès le HTML pré-rendu, avant le JavaScript.
 */
export function BasculeTheme({ className = '' }: { className?: string }) {
  const { theme, basculer } = useTheme();
  const sombre = theme === 'sombre';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={sombre}
      aria-label="Version sombre"
      title={sombre ? 'Passer en version claire' : 'Passer en version sombre'}
      onClick={basculer}
      className={`group grid h-11 w-[60px] shrink-0 place-items-center rounded-full ${className}`}
    >
      <span className="relative flex h-8 w-14 items-center justify-between rounded-full border border-encre/15 bg-fond-2 px-[7px] text-sourdine transition-colors group-hover:border-rose-doux/60">
        <Sun size={14} strokeWidth={1.75} aria-hidden="true" />
        <Moon size={14} strokeWidth={1.75} aria-hidden="true" />
        <span
          className="absolute left-[3px] top-[3px] grid h-6 w-6 place-items-center rounded-full bg-rose text-white shadow-cta transition-transform duration-300 ease-sillage dark:translate-x-6"
          aria-hidden="true"
        >
          <Sun size={14} strokeWidth={2} className="dark:hidden" />
          <Moon size={14} strokeWidth={2} className="hidden dark:block" />
        </span>
      </span>
    </button>
  );
}
