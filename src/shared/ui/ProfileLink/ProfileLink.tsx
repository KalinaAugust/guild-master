import React from 'react';
import Link from 'next/link';
import styles from './ProfileLink.module.css';

interface ProfileLinkProps {
  /** Public profile id used in `/profile/[publicId]`. When absent, children render unlinked. */
  publicId: string | null | undefined;
  className?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

/**
 * Wraps a user's avatar or name in a link to their public profile.
 * Falls back to a plain span (preserving `className`) when `publicId` is unknown.
 */
export const ProfileLink: React.FC<ProfileLinkProps> = ({
  publicId,
  className,
  children,
  ...rest
}) => {
  if (!publicId) {
    return <span className={className} {...rest}>{children}</span>;
  }

  // A passed `className` marks a text (name) link, which gets the hover underline;
  // avatar wrappers pass none and stay underline-free.
  const linkClass = className
    ? `${styles.link} ${styles.textLink} ${className}`
    : styles.link;

  return (
    <Link href={`/profile/${publicId}`} className={linkClass} data-user-public-id={publicId} {...rest}>
      {children}
    </Link>
  );
};
