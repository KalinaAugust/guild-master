import { describe, it, expect } from 'vitest';
import { stripMarkdown } from './stripMarkdown';

describe('stripMarkdown', () => {
  it('returns empty string for undefined or empty input', () => {
    expect(stripMarkdown('')).toBe('');
    expect(stripMarkdown(undefined as unknown as string)).toBe('');
  });

  it('removes bold and italic formatting', () => {
    expect(stripMarkdown('This is **bold** and *italic*')).toBe('This is bold and italic');
    expect(stripMarkdown('This is __bold__ and _italic_')).toBe('This is bold and italic');
  });

  it('removes links and images preserving link text / alt text', () => {
    expect(stripMarkdown('Check out [GitHub](https://github.com)')).toBe('Check out GitHub');
    expect(stripMarkdown('Look at this image: ![logo](logo.png)')).toBe('Look at this image: logo');
  });

  it('removes header hashes', () => {
    expect(stripMarkdown('# Header 1\n## Header 2\nNormal text')).toBe('Header 1 Header 2 Normal text');
  });

  it('removes list markers', () => {
    expect(stripMarkdown('* Item 1\n- Item 2\n1. Item 3\n2. Item 4')).toBe('Item 1 Item 2 Item 3 Item 4');
  });

  it('removes blockquotes', () => {
    expect(stripMarkdown('> Quote here\nNormal text')).toBe('Quote here Normal text');
  });

  it('removes inline and block code tags', () => {
    expect(stripMarkdown('Use `const x = 1` for variables')).toBe('Use const x = 1 for variables');
  });

  it('replaces newlines and multiple spaces with a single space', () => {
    expect(stripMarkdown('Multiple\n\nnewlines\nand    spaces.')).toBe('Multiple newlines and spaces.');
  });
});
