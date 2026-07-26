/**
 * Login Form Component
 * 
 * Handles user authentication with email and password.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLoginSchema, type LoginInput } from '../schemas/registration';
import { login } from '../actions/login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/src/modules/auth/components/password-input';
import { useI18n } from '@/src/i18n/i18n-provider';
import { resolveAuthError } from '@/src/modules/auth/utils/resolve-auth-error';

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { t, messages } = useI18n();
  const copy = messages.auth.loginForm;
  const placeholders = messages.auth.placeholders;
  const validation = messages.auth.validation;
  const validationSchema = useMemo(() => createLoginSchema(validation), [validation]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    try {
      const result = await login(data);

      if (result.success) {
        if (result.requiresActivation) {
          toast.success(copy.resume);
        } else {
          toast.success(copy.success);
        }
        router.push(result.destination || '/dashboard');
        router.refresh();
      } else {
        toast.error(resolveAuthError(messages, t, copy.failed, result));
      }
    } catch {
      toast.error(copy.unexpected);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.04em]">{copy.title}</h1>
        <p className="text-[15px] leading-6 text-muted-foreground">{copy.subtitle}</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  {copy.emailLabel}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={placeholders.email}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  {copy.passwordLabel}
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={placeholders.password}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
            />

          <div className="text-right text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-foreground hover:underline">
              {copy.forgotPassword}
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? copy.loggingIn : copy.login}
        </Button>
        </form>
      </Form>
    </div>
  );
}
