import type { ReactNode } from "react";

/** The centred card of the sign-in pages. */
export function AuthCard({ title, description, footer, children }: { title: string; description?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-border bg-card shadow-raised">
        <div aria-hidden="true" className="h-1" style={{ background: "var(--brand-gradient)" }} />
        <div className="px-6 pb-7 pt-7 sm:px-8">
          <div className="mb-6 text-center">
            <img src="/favicon.svg" alt="" aria-hidden="true" width={48} height={48} className="mx-auto mb-4 h-12 w-12 rounded-full shadow-card ring-1 ring-border" />
            <h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.015em]">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-muted-foreground" aria-live="polite">{description}</p>}
          </div>
          {children}
          {footer && <p className="mt-6 text-center text-[13px] text-muted-foreground">{footer}</p>}
        </div>
      </div>
    </main>
  );
}
