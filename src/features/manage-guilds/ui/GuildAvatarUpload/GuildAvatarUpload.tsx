'use client';

import Image from 'next/image';
import { useRef, useState, ChangeEvent } from 'react';
import { Image as ImageIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { CropperModal } from '@/shared/ui/CropperModal';
import styles from './GuildAvatarUpload.module.css';

interface GuildAvatarUploadProps {
  /** URL to display (local preview or persisted avatar). */
  avatarUrl: string | null;
  /** Called with the cropped image once the user confirms the crop. */
  onSelect: (blob: Blob) => void;
  disabled?: boolean;
}

export const GuildAvatarUpload = ({ avatarUrl, onSelect, disabled }: GuildAvatarUploadProps) => {
  const [imgToCrop, setImgToCrop] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImgToCrop(reader.result as string);
      setIsModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Clear input so the same file can be selected again
    e.target.value = '';
  };

  const handleSave = (blob: Blob) => {
    onSelect(blob);
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className={`${styles.container} ${disabled ? styles.disabled : ''}`}
        onClick={handleContainerClick}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Guild avatar"
            className={styles.avatar}
            width={80}
            height={80}
            unoptimized
          />
        ) : (
          <ImageIcon size={28} />
        )}

        <div className={styles.overlay}>
          <Camera size={20} />
          <span className={styles.overlayText}>Change</span>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className={styles.hiddenInput}
        />
      </div>

      {imgToCrop && (
        <CropperModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          image={imgToCrop}
          onSave={handleSave}
        />
      )}
    </>
  );
};
