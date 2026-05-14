'use client';

import { createClient } from '@/shared/api/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/Button';

export const LogoutButton = () => {
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations('Common');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <Button 
      variant="secondary"
      onClick={handleLogout}
    >
      {t('logout')}
    </Button>
  );
};
