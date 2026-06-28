'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/shared/api/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './LoginForm.module.css';

type AuthView = 'sign_in' | 'sign_up' | 'forgotten_password';

const viewTitles: Record<AuthView, string> = {
  sign_in: 'Sign in',
  sign_up: 'Sign up',
  forgotten_password: 'Reset password',
};

export const LoginForm = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [supabase] = useState(() => createClient());
  const [view, setView] = useState<AuthView>('sign_in');

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Auth UI does not redirect after email/password sign-in — do it ourselves.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/home');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  if (!mounted) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{viewTitles[view]}</h1>
      <Auth
        key={view}
        view={view}
        showLinks={false}
        supabaseClient={supabase}
        providers={[]}
        redirectTo={`${origin}/auth/callback`}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#38bdf8',
                brandAccent: '#0ea5e9',
                brandButtonText: '#ffffff',
                defaultButtonBackground: 'rgba(255, 255, 255, 0.05)',
                defaultButtonBackgroundHover: 'rgba(255, 255, 255, 0.1)',
                defaultButtonBorder: 'rgba(255, 255, 255, 0.1)',
                defaultButtonText: '#ffffff',
                inputBackground: 'rgba(255, 255, 255, 0.05)',
                inputBorder: 'rgba(255, 255, 255, 0.1)',
                inputBorderHover: '#38bdf8',
                inputBorderFocus: '#38bdf8',
                inputText: '#ffffff',
                inputLabelText: 'rgba(255, 255, 255, 0.7)',
                inputPlaceholder: 'rgba(255, 255, 255, 0.6)',
                messageText: '#ffffff',
                messageTextDanger: '#fca5a5',
                anchorTextColor: 'rgba(255, 255, 255, 0.7)',
                anchorTextHoverColor: '#ffffff',
                dividerBackground: 'rgba(255, 255, 255, 0.1)',
              },
              radii: {
                borderRadiusButton: '10px',
                inputBorderRadius: '10px',
              },
            },
          },
          className: {
            button: styles.button,
            input: styles.input,
            label: styles.label,
            anchor: styles.anchor,
            divider: styles.divider,
            message: styles.message,
          },
        }}
      />
      <div className={styles.links}>
        {view === 'sign_in' && (
          <>
            <button type="button" className={styles.linkButton} onClick={() => setView('forgotten_password')}>
              Forgot your password?
            </button>
            <button type="button" className={styles.linkButton} onClick={() => setView('sign_up')}>
              Don&apos;t have an account? Sign up
            </button>
          </>
        )}
        {view === 'sign_up' && (
          <button type="button" className={styles.linkButton} onClick={() => setView('sign_in')}>
            Already have an account? Sign in
          </button>
        )}
        {view === 'forgotten_password' && (
          <button type="button" className={styles.linkButton} onClick={() => setView('sign_in')}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
};
