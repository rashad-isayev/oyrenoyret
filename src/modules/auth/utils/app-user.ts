import { cache } from 'react';
import { prisma } from '@/src/db/client';

export type AppUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarVariant: string;
  email: string;
  credits: number | null;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  tutorialCompletedAt: Date | null;
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
      credits: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      tutorialCompletedAt: true,
      suspensionUntil: true,
      suspensionReason: true,
      bannedAt: true,
      banReason: true,
    },
  });
});
