'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import getCroppedImg from '@/shared/lib/getCroppedImg';
import styles from './CropperModal.module.css';

interface CropperModalProps {
  image: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}

export const CropperModal: React.FC<CropperModalProps> = ({
  image,
  isOpen,
  onClose,
  onSave,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const blob = await getCroppedImg(image, croppedAreaPixels);
      if (blob) {
        onSave(blob);
        onClose();
      }
    } catch (error) {
      console.error('Failed to crop image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Обрезать фото">
      <div className={styles.cropperContainer}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.sliderContainer}>
          <label className={styles.sliderLabel}>Увеличение</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Отмена
          </Button>
          <Button onClick={handleSave} isLoading={isProcessing}>
            {isProcessing ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
