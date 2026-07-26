/**
 * Registration Validation Schemas
 * 
 * Zod schemas for validating registration form data at each step.
 * All schemas include client and server-side validation.
 */

import { z } from 'zod';

export interface AuthValidationMessages {
  firstNameRequired: string;
  firstNameMax: string;
  lastNameRequired: string;
  lastNameMax: string;
  emailRequired: string;
  emailInvalid: string;
  emailMax: string;
  passwordMin: string;
  passwordMax: string;
  passwordUpper: string;
  passwordLower: string;
  passwordNumber: string;
  passwordSpecial: string;
  confirmPasswordRequired: string;
  passwordsMismatch: string;
  verificationLength: string;
  verificationDigits: string;
  loginPasswordRequired: string;
}

export const DEFAULT_VALIDATION_MESSAGES: AuthValidationMessages = {
  firstNameRequired: 'First name is required',
  firstNameMax: 'First name must be less than 50 characters',
  lastNameRequired: 'Last name is required',
  lastNameMax: 'Last name must be less than 50 characters',
  emailRequired: 'Email is required',
  emailInvalid: 'Invalid email address',
  emailMax: 'Email must be less than 254 characters',
  passwordMin: 'Password must be at least 8 characters',
  passwordMax: 'Password must be at most 72 characters',
  passwordUpper: 'Password must contain at least one uppercase letter',
  passwordLower: 'Password must contain at least one lowercase letter',
  passwordNumber: 'Password must contain at least one number',
  passwordSpecial: 'Password must contain at least one special character',
  confirmPasswordRequired: 'Please confirm your password',
  passwordsMismatch: 'Passwords do not match',
  verificationLength: 'Verification code must be 6 digits',
  verificationDigits: 'Verification code must contain only numbers',
  loginPasswordRequired: 'Password is required',
};

/**
 * Email verification
 */
export const verificationCodeSchema = createVerificationCodeSchema(DEFAULT_VALIDATION_MESSAGES);

export function createVerificationCodeSchema(messages: AuthValidationMessages) {
  return z.object({
    code: z
      .string()
      .length(6, messages.verificationLength)
      .regex(/^\d+$/, messages.verificationDigits),
  });
}

export type VerificationCodeInput = z.infer<typeof verificationCodeSchema>;

export const LEARNING_MOTIVATIONS = [
  'school',
  'career',
  'curiosity',
  'confidence',
] as const;

export const WEEKLY_LEARNING_GOALS = [
  'light',
  'steady',
  'ambitious',
] as const;

export const learningProfileSchema = z.object({
  learningMotivation: z.enum(LEARNING_MOTIVATIONS),
  declaredAge: z.number().int().min(5).max(100),
  weeklyLearningGoal: z.enum(WEEKLY_LEARNING_GOALS),
});

export type LearningProfileInput = z.infer<typeof learningProfileSchema>;

export function createOnboardingAccountSchema(messages: AuthValidationMessages) {
  return learningProfileSchema
    .extend({
      firstName: z
        .string()
        .min(1, messages.firstNameRequired)
        .max(50, messages.firstNameMax)
        .trim(),
      lastName: z
        .string()
        .max(50, messages.lastNameMax)
        .trim(),
      email: z
        .string()
        .min(1, messages.emailRequired)
        .email(messages.emailInvalid)
        .max(254, messages.emailMax)
        .toLowerCase()
        .trim(),
      password: z
        .string()
        .min(8, messages.passwordMin)
        .max(72, messages.passwordMax)
        .regex(/[A-Z]/, messages.passwordUpper)
        .regex(/[a-z]/, messages.passwordLower)
        .regex(/[0-9]/, messages.passwordNumber)
        .regex(/[^A-Za-z0-9]/, messages.passwordSpecial),
      confirmPassword: z
        .string()
        .min(1, messages.confirmPasswordRequired)
        .max(72, messages.passwordMax),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsMismatch,
      path: ['confirmPassword'],
    });
}

export const onboardingAccountSchema = createOnboardingAccountSchema(
  DEFAULT_VALIDATION_MESSAGES,
);
export type OnboardingAccountInput = z.infer<typeof onboardingAccountSchema>;

export const pendingOnboardingEmailSchema = z.object({
  email: z.string().min(1).email().max(254).toLowerCase().trim(),
  password: z.string().min(1).max(72),
});

export type PendingOnboardingEmailInput = z.infer<
  typeof pendingOnboardingEmailSchema
>;

export const onboardingGuidelinesSchema = z.object({
  guidelinesAccepted: z.literal(true),
  guardianAuthorityAccepted: z.boolean().optional(),
});

export type OnboardingGuidelinesInput = z.infer<typeof onboardingGuidelinesSchema>;

/**
 * Login Schema
 */
export const loginSchema = createLoginSchema(DEFAULT_VALIDATION_MESSAGES);

export function createLoginSchema(messages: AuthValidationMessages) {
  return z.object({
    email: z
      .string()
      .min(1, messages.emailRequired)
      .email(messages.emailInvalid)
      .max(254, messages.emailMax)
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, messages.loginPasswordRequired)
      .max(72, messages.passwordMax),
  });
}

export type LoginInput = z.infer<typeof loginSchema>;
