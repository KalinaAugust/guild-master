'use client';

import Image from 'next/image';
import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { User, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateAvatar } from '@/entities/user/api/updateAvatar';
import { CropperModal } from '../CropperModal';
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

  const handleContainerClick = () => {
    if (isUploading) return;
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
  };

  const handleSave = async (blob: Blob) => {
    setIsUploading(true);
    try {
      await updateAvatar(userId, blob);
      toast.success('Avatar updated successfully');
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
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
            <Loader2 size={24} className={styles.spinner} />
          ) : (
            <>
              <Camera size={24} />
              <span className={styles.overlayText}>Change</span>
            </>
          )}
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
