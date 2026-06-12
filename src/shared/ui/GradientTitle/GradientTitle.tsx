import * as React from 'react';
import styles from './GradientTitle.module.css';

type TitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'p';

export interface GradientTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Element to render. Defaults to h1. */
  as?: TitleTag;
  /** Any CSS font-size value, e.g. "1.75rem" or "32px". */
  fontSize?: string;
  /** Any CSS font-family value. */
  fontFamily?: string;
  /** Any CSS font-weight value. */
  fontWeight?: React.CSSProperties['fontWeight'];
  children: React.ReactNode;
}

/**
 * Reusable heading with the app's signature white→accent gradient text fill.
 * Font size, family and weight are tunable via props (passed through as CSS
 * custom properties so the visual styling stays in the CSS module).
 */
export const GradientTitle: React.FC<GradientTitleProps> = ({
  as: Tag = 'h1',
  fontSize,
  fontFamily,
  fontWeight,
  className,
  style,
  children,
  ...rest
}) => {
  const cssVars = {
    ...(fontSize !== undefined ? { '--gradient-title-font-size': fontSize } : {}),
    ...(fontFamily !== undefined ? { '--gradient-title-font-family': fontFamily } : {}),
    ...(fontWeight !== undefined ? { '--gradient-title-font-weight': String(fontWeight) } : {}),
    ...style,
  } as React.CSSProperties;

  return (
    <Tag className={[styles.title, className].filter(Boolean).join(' ')} style={cssVars} {...rest}>
      {children}
    </Tag>
  );
};
