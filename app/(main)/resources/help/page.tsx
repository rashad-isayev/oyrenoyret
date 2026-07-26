import Link from 'next/link';
import { getI18n } from '@/src/i18n/server';
import { BrandText } from '@/src/components/ui/brand-text';
import { PublicPageShell } from '@/src/components/ui/public-page-shell';
import { Notice } from '@/components/ui/notice';

export const metadata = {
  title: 'Help Center',
};

export default async function HelpCenterPage() {
  const { messages } = await getI18n();
  const copy = messages.main.help;
  return (
    <PublicPageShell>
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <BrandText>{copy.title}</BrandText>
        </h1>
        <p className="text-sm text-muted-foreground">
          <BrandText>{copy.subtitle}</BrandText>
        </p>
      </div>
      <div className="mt-8 space-y-4">
        <Notice>
          <BrandText>{copy.notice}</BrandText>
        </Notice>
        <Link
          href="/contact"
          className="inline-flex items-center text-sm font-medium text-foreground transition-colors hover:text-foreground/80"
        >
          <BrandText>{copy.contact}</BrandText>
        </Link>
      </div>
    </PublicPageShell>
  );
}
