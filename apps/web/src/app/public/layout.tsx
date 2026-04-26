export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-base font-bold text-foreground">
              Liberia Gender Equality Dashboard
            </p>
            <p className="text-xs text-muted-foreground">
              Ministry of Gender, Children and Social Protection · MOGCSP
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Powered by GB MIS</p>
            <p className="text-xs text-muted-foreground">World Bank LWEP 2022–2027</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="mt-16 border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-muted-foreground">
          <p>
            Data published here reflects verified indicator values only. Values below the
            k-anonymity threshold (k=5) are suppressed.
          </p>
          <p className="mt-1">
            Source: Liberia Gender-Based Management Information System (GB MIS) ·
            Ministry of Gender, Children and Social Protection
          </p>
        </div>
      </footer>
    </div>
  );
}
