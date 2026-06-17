'use client';

import Image from 'next/image';
import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User, Camera } from 'lucide-react';
import { Spinner } from '@/shared/ui/Spinner';
import { toast } from 'sonner';
import { updateAvatar } from '@/entities/user';
import { CropperModal } from '@/shared/ui/CropperModal';
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile } from '@/shared/lib/imageValidation';
import styles from './AvatarUpload.module.css';

interface AvatarUploadProps {
  initialAvatarUrl: string | null;
  userId: string;
}

export const AvatarUpload = ({ initialAvatarUrl, userId }: AvatarUploadProps) => {
  const [imgToCrop, setImgToCrop] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useTranslations('UpdateProfile');

  const handleContainerClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImgToCrop(reader.result as string);
      setIsModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (blob: Blob) => {
    setIsUploading(true);
    try {
      await updateAvatar(userId, blob);
      toast.success(t('avatar.updated'));
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error(t('avatar.updateError'));
    } finally {
      setIsUploading(false);
      // Clear input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div 
        className={`${styles.container} ${isUploading ? styles.uploading : ''}`} 
        onClick={handleContainerClick}
      >
        {initialAvatarUrl ? (
          <Image 
            src={initialAvatarUrl} 
            alt="Avatar" 
            className={styles.avatar} 
            width={80} 
            height={80}
            unoptimized // Using unoptimized because Supabase URLs are dynamic
          />
        ) : (
          <User size={48} />
        )}
        
        <div className={styles.overlay}>
          {isUploading ? (
            <Spinner size={24} color="var(--text-primary)" />
          ) : (
            <>
              <Camera size={24} />
              <span className={styles.overlayText}>{t('avatar.change')}</span>
            </>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ACCEPTED_IMAGE_ACCEPT}
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
