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
        appearance={{ theme: ThemeSupa }} 
        providers={['google']} 
        redirectTo={`${origin}/auth/callback`}
      />
    </div>
  );
};
