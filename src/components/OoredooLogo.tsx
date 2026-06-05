export function OoredooLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
     
      <span className="text-2xl font-bold tracking-tight text-primary">
        Ooredoo<span className="text-foreground">'</span>
      </span>
    </div>
  );
}
