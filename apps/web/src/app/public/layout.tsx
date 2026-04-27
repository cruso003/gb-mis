import { useTranslations } from 'next-intl';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('public');
  const tCommon = useTranslations('common');
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-base font-bold text-foreground">{t('title')}</p>
            <p className="text-xs text-muted-foreground">{tCommon('ministry')} · MOGCSP</p>
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
          <p>{t('dataNote')}</p>
          <p className="mt-1">{t('footer')}</p>
        </div>
      </footer>
    </div>
  );
}
