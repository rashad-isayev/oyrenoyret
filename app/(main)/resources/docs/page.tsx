import { getI18n } from '@/src/i18n/server';
import { BrandText } from '@/src/components/ui/brand-text';
import { PublicPageShell } from '@/src/components/ui/public-page-shell';
import { Notice } from '@/components/ui/notice';

export const metadata = {
  title: 'Documentation',
};

export default async function DocumentationPage() {
  const { messages } = await getI18n();
  const copy = messages.main.docs;
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
      <Notice className="mt-8">
        <BrandText>{copy.notice}</BrandText>
      </Notice>
    </PublicPageShell>
  );
}
