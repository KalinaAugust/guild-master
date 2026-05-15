# Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to personalize their profiles by uploading and cropping photos, storing them in Supabase Storage.

**Architecture:** Implement as an FSD feature `update-profile-avatar`. Use `react-easy-crop` for the UI and Canvas API for client-side image processing.

**Tech Stack:** Next.js 16, Supabase, react-easy-crop, Lucide React, Radix UI Dialog.

---

### Task 1: Infrastructure & Dependencies

**Files:**
- Modify: `package.json`
- Action: Manual Supabase Storage setup (described in steps)

- [ ] **Step 1: Install dependencies**
Run: `npm install react-easy-crop`

- [ ] **Step 2: Note on Supabase Setup**
Ensure the `avatars` bucket exists in Supabase Storage with the following RLS:
- SELECT: public
- INSERT/UPDATE/DELETE: `auth.uid() = (storage.foldername(name))[1]`

- [ ] **Step 3: Commit**
```bash
git commit -m "chore: install react-easy-crop" --allow-empty
```

---

### Task 2: Image Processing Utility

**Files:**
- Create: `src/features/update-profile-avatar/lib/getCroppedImg.ts`

- [ ] **Step 1: Implement getCroppedImg**
```typescript
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return null

  canvas.width = 256
  canvas.height = 256

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    256,
    256
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/png')
  })
}
```

- [ ] **Step 2: Commit**
```bash
git add src/features/update-profile-avatar/lib/getCroppedImg.ts
git commit -m "feat: add image cropping utility"
```

---

### Task 3: User Entity API Update

**Files:**
- Create: `src/entities/user/api/updateAvatar.ts`

- [ ] **Step 1: Implement updateAvatar function**
```typescript
import { createClient } from '@/shared/api/supabase/client';

export const updateAvatar = async (userId: string, blob: Blob) => {
  const supabase = createClient();
  const filePath = `${userId}/avatar-${Date.now()}.png`;

  // 1. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, blob, { upsert: true });

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // 3. Update Profiles table
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) throw updateError;

  return publicUrl;
};
```

- [ ] **Step 2: Commit**
```bash
git add src/entities/user/api/updateAvatar.ts
git commit -m "feat: add updateAvatar API"
```

---

### Task 4: Cropper Modal Component

**Files:**
- Create: `src/features/update-profile-avatar/ui/CropperModal/CropperModal.tsx`
- Create: `src/features/update-profile-avatar/ui/CropperModal/CropperModal.module.css`

- [ ] **Step 1: Implement CropperModal**
Use Radix Dialog and react-easy-crop.

- [ ] **Step 2: Commit**
```bash
git add src/features/update-profile-avatar/ui/CropperModal
git commit -m "feat: add CropperModal component"
```

---

### Task 5: Integration in Profile Page

**Files:**
- Modify: `src/app/profile/page.tsx`
- Create: `src/features/update-profile-avatar/ui/AvatarUpload/AvatarUpload.tsx`

- [ ] **Step 1: Create AvatarUpload trigger component**
- [ ] **Step 2: Replace static avatar in ProfilePage**
- [ ] **Step 3: Commit**
```bash
git add src/features/update-profile-avatar/ui/AvatarUpload src/app/profile/page.tsx
git commit -m "feat: integrate avatar upload into profile page"
```
