import { cache } from 'react';
import { prisma } from '@/src/db/client';

export type AppUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarVariant: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  guidelinesAcceptedAt: Date | null;
  guidelinesVersion: string | null;
  accountOwnerType: string | null;
  tutorialCompletedAt: Date | null;
  tutorialSkippedAt: Date | null;
  suspensionUntil?: Date | null;
  suspensionReason?: string | null;
  bannedAt?: Date | null;
  banReason?: string | null;
};

export const getAppUser = cache(async (userId: string): Promise<AppUser | null> => {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarVariant: true,
      email: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      guidelinesAcceptedAt: true,
      guidelinesVersion: true,
      accountOwnerType: true,
      tutorialCompletedAt: true,
      tutorialSkippedAt: true,
      suspensionUntil: true,
      suspensionReason: true,
      bannedAt: true,
      banReason: true,
    },
  });
});
