'use client';

import * as React from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Placeholder } from '@tiptap/extensions';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Check } from 'lucide-react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  /** Current content as a Markdown string. */
  value: string;
  /** Called with the serialized Markdown on every edit. */
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

interface ToolButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({ onClick, active, label, children }) => (
  <button
    type="button"
    className={`${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
  >
    {children}
  </button>
);

const Toolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const linkInputRef = React.useRef<HTMLInputElement>(null);

  const openLink = () => {
    setLinkUrl(editor.getAttributes('link').href ?? '');
    setLinkOpen(true);
  };

  const closeLink = () => {
    setLinkOpen(false);
    editor.chain().focus().run();
  };

  const applyLink = () => {
    const href = linkUrl.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (href) {
      chain.setLink({ href }).run();
    } else {
      chain.unsetLink().run();
    }
    setLinkOpen(false);
  };

  React.useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  return (
    <div className={styles.toolbar}>
      <ToolButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolButton>
      <ToolButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={16} />
      </ToolButton>
      <ToolButton
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={16} />
      </ToolButton>
      <ToolButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolButton>
      <ToolButton
        label="Ordered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolButton>
      <ToolButton label="Link" active={editor.isActive('link') || linkOpen} onClick={openLink}>
        <Link2 size={16} />
      </ToolButton>

      {linkOpen && (
        <div className={styles.linkPopover}>
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closeLink();
              }
            }}
            placeholder="https://example.com"
            className={styles.linkInput}
          />
          <button type="button" className={styles.linkApply} onClick={applyLink}>
            <Check size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Markdown,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    contentType: 'markdown',
    // Avoid SSR hydration mismatch in the Next App Router.
    immediatelyRender: false,
    editorProps: { attributes: { class: styles.content } },
    onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
  });

  // Sync external resets (e.g. the modal reopening for a new/edited target).
  // Skipped while typing because `value` then already equals the editor output.
  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getMarkdown()) {
      editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};
