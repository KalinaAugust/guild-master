import { Header, UserMenu } from "@/widgets/header";
import { Sidebar } from "@/widgets/sidebar";
import { getUser } from "@/entities/user/api/getUser";
import { resolveDisplayName } from '@/entities/user';
import { CopyrightFooter } from "./CopyrightFooter";
import { PageTransition } from "./PageTransition";
import styles from './Layout.module.css';

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();

  return (
    <>
      {user && (
        <Sidebar
          footer={
            <UserMenu
              publicId={user.profile?.publicId}
              email={user.email}
              avatarUrl={user.profile?.avatarUrl}
              name={resolveDisplayName({
                fullName: user.profile?.fullName ?? null,
                alias: user.profile?.alias ?? null,
                displayAsAlias: user.profile?.displayAsAlias ?? false,
              })}
              icon={user.profile?.icon ?? null}
            />
          }
        />
      )}
      <div className={styles.appShell}>
        <Header />
        <div className={styles.content}>
          <PageTransition>{children}</PageTransition>
        </div>
        <CopyrightFooter />
      </div>
    </>
  );
}
