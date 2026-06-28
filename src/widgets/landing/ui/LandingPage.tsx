import { LandingHeader } from './LandingHeader';
import { Hero } from './Hero';
import { Features } from './Features';
import { FinalCta } from './FinalCta';
import { LandingFooter } from './LandingFooter';
import styles from './LandingPage.module.css';

export const LandingPage = () => (
  <div className={styles.page}>
    <LandingHeader />
    <main className={styles.main}>
      <Hero />
      <Features />
      <FinalCta />
    </main>
    <LandingFooter />
  </div>
);
