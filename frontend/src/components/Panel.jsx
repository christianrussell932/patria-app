/* Reusable framed panel — hairline border, no shadow. */
export default function Panel({ label, hint, action, children, className = "", testId }) {
  return (
    <section className={`border border-border bg-background p-5 md:p-6 ${className}`} data-testid={testId}>
      {(label || action) && (
        <header className="flex items-baseline justify-between mb-4 gap-3">
          {label && (
            <div>
              <div className="overline">{label}</div>
              {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
            </div>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
