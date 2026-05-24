'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, LogOut, ChevronDown, Languages, ShieldPlus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/shared/api/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setUserLocale } from '@/features/language-switcher/api/setLocale';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  email?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({ email }) => {
  const locale = useLocale();
  const t = useTranslations('Common');
  const guildT = useTranslations('Guild');
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = React.useTransition();
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      setUserLocale(newLocale);
    });
  };

  return (
    <DropdownMenu.Root onOpenChange={(open) => {
      if (!open) {
        setIsLanguageOpen(false);
      }
    }}>
      <DropdownMenu.Trigger asChild>
        <button className={styles.trigger} aria-label="User menu">
          <User size={20} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.content} sideOffset={5} align="end">
          {email && (
            <>
              <DropdownMenu.Item className={styles.item} asChild>
                <Link href="/profile" className={styles.link}>
                  <div className={styles.itemContent}>
                    <User size={18} />
                    <span>{t('profile')}</span>
                  </div>
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item className={styles.item} asChild>
                <Link href="/guilds" className={styles.link}>
                  <div className={styles.itemContent}>
                    <ShieldPlus size={18} />
                    <span>{guildT('manageTitle')}</span>
                  </div>
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.separator} />
            </>
          )}

          <div className={styles.accordion}>
            <button 
              className={styles.accordionTrigger} 
              onClick={(e) => {
                e.preventDefault();
                setIsLanguageOpen(!isLanguageOpen);
              }}
            >
              <div className={styles.itemContent}>
                <Languages size={18} />
                <span>{t('language')}</span>
              </div>
              <ChevronDown 
                size={16} 
                className={styles.chevron}
                style={{ transform: isLanguageOpen ? 'rotate(180deg)' : 'none' }} 
              />
            </button>
            
            {isLanguageOpen && (
              <div className={styles.accordionContent}>
                <DropdownMenu.Item 
                  className={styles.item} 
                  onSelect={() => handleLanguageChange('en')}
                  disabled={locale === 'en' || isPending}
                >
                  <div className={styles.langItem}>
                    <span style={{ marginRight: '0.5rem' }}>🇺🇸</span> {t('locales.en')}
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  className={styles.item} 
                  onSelect={() => handleLanguageChange('ru')}
                  disabled={locale === 'ru' || isPending}
                >
                  <div className={styles.langItem}>
                    <span style={{ marginRight: '0.5rem' }}>🇷🇺</span> {t('locales.ru')}
                  </div>
                </DropdownMenu.Item>
              </div>
            )}
          </div>

          {email && (
            <>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.Item className={styles.item} onSelect={handleLogout}>
                <div className={styles.itemContent}>
                  <LogOut size={18} />
                  <span>{t('logout')}</span>
                </div>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
