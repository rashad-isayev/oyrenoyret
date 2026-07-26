import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/src/components/layout/site-header';
import { SiteFooter } from '@/src/components/layout/site-footer';
import { BrandText } from '@/src/components/ui/brand-text';
import { PublicPageShell } from '@/src/components/ui/public-page-shell';
import { getI18n } from '@/src/i18n/server';

export const metadata = {
  title: 'Learn more about us',
};

export default async function LearnMorePage() {
  const { messages } = await getI18n();
  const copy = messages.learnMore;

  const values = copy.values;
  const pillars = copy.pillars;
  const steps = copy.steps;
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-28 top-64 h-80 w-80 rounded-full bg-muted/40 blur-[140px]" />

      <SiteHeader showSpacer={false} showSeparator />
      <PublicPageShell width="wide" className="relative">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs uppercase text-muted-foreground">
              {copy.pill}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              <BrandText>{copy.title}</BrandText>
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              <BrandText>{copy.subtitle}</BrandText>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="primary">
                <Link href="/welcome">{copy.ctaPrimary}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary-primary">
                <Link href="/contact">{copy.ctaSecondary}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="space-y-6 rounded-xl bg-secondary p-6">
              <div className="space-y-3">
                <p className="text-xs uppercase text-muted-foreground">
                  <BrandText>{copy.focusLabel}</BrandText>
                </p>
                <h2 className="text-xl font-medium text-foreground">
                  <BrandText>{copy.focusTitle}</BrandText>
                </h2>
                <p className="text-sm text-muted-foreground">
                  <BrandText>{copy.focusBody}</BrandText>
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {values.map((value) => (
                  <div key={value.title} className="rounded-lg bg-background p-4">
                    <h3 className="text-sm font-medium text-foreground">
                      <BrandText>{value.title}</BrandText>
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <BrandText>{value.description}</BrandText>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                <BrandText>{copy.pillarsTitle}</BrandText>
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                <BrandText>{copy.pillarsSubtitle}</BrandText>
              </p>
            </div>
            <div className="rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs text-muted-foreground">
              <BrandText>{copy.pillarsBadge}</BrandText>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group rounded-lg border border-border bg-background p-5 transition-colors duration-150 hover:bg-secondary"
              >
                <div className="relative space-y-3">
                  <h3 className="text-lg font-medium text-foreground">
                    <BrandText>{pillar.title}</BrandText>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    <BrandText>{pillar.description}</BrandText>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              <BrandText>{copy.rhythmTitle}</BrandText>
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              <BrandText>{copy.rhythmSubtitle}</BrandText>
            </p>
            <div className="rounded-lg bg-secondary p-5">
              <p className="text-sm text-muted-foreground">
                <BrandText>{copy.rhythmNote}</BrandText>
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            {steps.map((step) => (
              <div key={step.title} className="rounded-lg border border-border bg-background p-5">
                <h3 className="text-base font-medium text-foreground">
                  <BrandText>{step.title}</BrandText>
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  <BrandText>{step.description}</BrandText>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="rounded-xl bg-secondary px-6 py-10 sm:px-10">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div className="space-y-3">
                <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                  <BrandText>{copy.ctaTitle}</BrandText>
                </h2>
                <p className="text-sm text-muted-foreground sm:text-base">
                  <BrandText>{copy.ctaBody}</BrandText>
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button asChild size="lg" variant="primary">
                  <Link href="/welcome">{copy.ctaStart}</Link>
                </Button>
                <Button asChild size="lg" variant="secondary-primary">
                  <Link href="/">{copy.ctaBack}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </PublicPageShell>
      <SiteFooter />
    </div>
  );
}
