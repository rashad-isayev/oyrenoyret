import { readdirSync } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/src/components/layout/site-header';
import { SiteFooter } from '@/src/components/layout/site-footer';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { prisma } from '@/src/db/client';
import { StickyPartnersBar } from '@/src/components/landing/sticky-partners-bar';
import { getI18n } from '@/src/i18n/server';

export const metadata = {
  title: {
    absolute: 'oyrenoyret.org',
  },
};

interface PartnerLogo {
  src: string;
  name: string;
}

function getPartnerLogos(): PartnerLogo[] {
  const publicDir = path.join(process.cwd(), 'public');
  let files: string[] = [];
  try {
    files = readdirSync(publicDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }

  const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp']);

  return files
    .map((file) => {
      if (!file.toLowerCase().startsWith('partner')) return null;

      const ext = path.extname(file);
      if (ext && !allowedExtensions.has(ext.toLowerCase())) {
        return null;
      }

      const baseName = ext ? file.slice(0, -ext.length) : file;
      const match = /^partner(?:(\d+)[-_])?(.+)?$/i.exec(baseName);
      if (!match) return null;
      const order = match[1] ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
      const rawName = (match[2] ?? '').trim();
      const name = rawName
        ? rawName
            .replace(/[-_]+/g, ' ')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase())
        : match[1]
          ? `Partner ${order}`
          : 'Partner';

      return {
        order,
        name,
        src: `/${file}`,
        sortKey: rawName.toLowerCase(),
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        order: number;
        src: string;
        name: string;
        sortKey: string;
      } => Boolean(entry),
    )
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.sortKey.localeCompare(b.sortKey) ||
        a.src.localeCompare(b.src),
    )
    .map(({ src, name }) => ({ src, name }));
}

export default async function HomePage() {
  const userId = await getCurrentSession();
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      redirect('/login');
    }
    redirect('/dashboard');
  }

  const partnerLogos = getPartnerLogos();
  const { messages } = await getI18n();
  const copy = messages.landing;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex min-h-screen flex-col">
        <SiteHeader showSpacer={false} showSeparator />
        <main className="flex-1">
          <section className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
            <div className="flex min-h-[560px] w-full items-center justify-center py-16 text-center">
              <div className="mx-auto w-full max-w-4xl">
                <p className="brand-font mb-6 text-sm text-muted-foreground">oyrenoyret.org</p>
                <h1 className="text-[44px] font-normal leading-[1.04] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-[72px]">
                  {copy.headline}
                </h1>
                <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                  {copy.subtitle}
                </p>

                <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                  <Button asChild size="lg" variant="primary" className="sm:min-w-40">
                    <Link href="/welcome">{copy.ctaPrimary}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="sm:min-w-40">
                    <Link href="/learn-more">{copy.ctaSecondary}</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-10 w-full lg:mt-16">
              <div className="relative overflow-hidden rounded-[28px] border border-border/80 bg-card p-2 shadow-float sm:p-3">
                <div className="flex h-11 items-center gap-2 rounded-t-[20px] border-b border-border/70 bg-secondary px-4" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  <span className="mx-auto -translate-x-6 rounded-full border border-border/70 bg-background/80 px-8 py-1 text-[10px] text-muted-foreground">
                    oyrenoyret.org
                  </span>
                </div>
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-b-[20px] bg-muted/20">
                  <Image
                    src="/landing-page-screen.gif"
                    alt={copy.previewAlt}
                    fill
                    priority
                    unoptimized
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
                </div>
              </div>
            </div>
            <StickyPartnersBar partners={partnerLogos} />
          </section>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
