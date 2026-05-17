import { createClient } from '@/shared/api/supabase/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { UserMenu } from './UserMenu';

export const Header = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Common');
  const authT = await getTranslations('Auth');

  return (
    <header style={{ 
      padding: '1rem 2rem', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', textDecoration: 'none', color: 'inherit' }}>
        {t('title')}
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {user ? (
          <UserMenu email={user.email} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <UserMenu />
            <Link href="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
              {authT('login')}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};
