import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <LoginForm />
    </main>
  );
}
