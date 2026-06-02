export function OoredooLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
        <circle cx="20" cy="20" r="18" fill="hsl(0 0% 100%)" stroke="var(--primary)" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="6" fill="var(--primary)" />
      </svg>
      <span className="text-2xl font-bold tracking-tight text-primary">
        ooredoo<span className="text-foreground">'</span>
      </span>
    </div>
  );
}
