'use client';

import { createClient } from '@/shared/api/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export const LogoutButton = () => {
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations('Common');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        cursor: 'pointer'
      }}
    >
      {t('logout')}
    </button>
  );
};
