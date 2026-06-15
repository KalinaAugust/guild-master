'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import styles from './Markdown.module.css';

interface MarkdownProps {
  source: string;
  className?: string;
}

/**
 * Renders markdown as sanitized HTML. Sanitization needs a DOM, so on the server
 * (SSR pass) we render nothing — announcement content is always fetched and shown
 * client-side, so there is no visible flash.
 */
export const Markdown: React.FC<MarkdownProps> = ({ source, className }) => {
  const html = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = marked.parse(source ?? '', { async: false, breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
  }, [source]);

  return (
    <div
      className={[styles.markdown, className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
