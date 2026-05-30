'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/shared/api/supabase/client';
import { useEffect, useState } from 'react';
import styles from './LoginForm.module.css';

export const LoginForm = () => {
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (!mounted) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={styles.container}>
      <Auth
        supabaseClient={supabase}
        providers={['google']}
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
    </div>
  );
};
