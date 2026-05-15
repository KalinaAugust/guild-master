# Design Spec: Avatar Upload with Cropping

**Status:** Draft
**Date:** 2026-05-15
**Topic:** Implementing avatar upload functionality with client-side cropping using `react-easy-crop` and Supabase Storage.

---

## 1. Problem Statement
Users currently have a static avatar placeholder. They need a way to personalize their profile by uploading and cropping their own photos to ensure a consistent look (square/circular crop) across the application.

## 2. Proposed Solution
Implement a client-side cropping flow integrated with Supabase Storage. This involves a new FSD feature `update-profile-avatar` that handles file selection, cropping UI, and data persistence.

## 3. Architecture

### FSD Structure
- **Feature:** `src/features/update-profile-avatar`
  - `ui/AvatarUpload/AvatarUpload.tsx`: Main component with the upload trigger.
  - `ui/AvatarUpload/AvatarUpload.module.css`: Styles for the upload component and cropper.
  - `ui/CropperModal/CropperModal.tsx`: Radix Dialog wrapper for the `react-easy-crop` interface.
  - `lib/getCroppedImg.ts`: Utility function using Canvas API to generate the final image blob.
- **Entity:** `src/entities/user`
  - `api/updateAvatar.ts`: Supabase interaction logic (upload to Storage + update Profile table).

### Data Flow
1. User selects an image file.
2. `AvatarUpload` reads the file as a Data URL and opens `CropperModal`.
3. User adjusts the crop area using `react-easy-crop`.
4. On "Save", `getCroppedImg` processes the image on a canvas and returns a `Blob`.
5. `updateAvatar` is called:
   - Uploads the blob to `avatars/{userId}/avatar.png` in Supabase Storage.
   - Updates `profiles.avatar_url` with the public URL of the uploaded image.
6. The UI is updated to show the new avatar.

## 4. Technical Details

### Dependencies
- `react-easy-crop`: For the cropping interface.
- `lucide-react`: For icons (Camera, Upload).
- `@radix-ui/react-dialog`: For the modal (already in project).

### Supabase Configuration (Required Changes)
- **Storage Bucket:** Create a public bucket named `avatars`.
- **RLS Policies:**
  - `SELECT`: `true` (Public access).
  - `INSERT/UPDATE`: `auth.uid() = (storage.foldername(name))[1]` (User can only upload to their own folder).
  - `DELETE`: `auth.uid() = (storage.foldername(name))[1]`.

### Client-side Processing
- Output format: `image/png` or `image/jpeg`.
- Dimensions: Fixed `256x256px` for consistency and performance.

## 5. UI/UX Design
- **Trigger:** The avatar in the profile page will have a hover state with a "Change Photo" overlay.
- **Modal:** A clean Radix Dialog containing:
  - The cropping area (circular mask).
  - A zoom slider.
  - "Cancel" and "Save" buttons.
- **Feedback:** Loading spinner on the "Save" button while uploading. Sonner toast for success/error messages.

## 6. Testing Strategy
- **Unit Tests:**
  - `getCroppedImg` logic (mocking canvas if possible).
  - `updateAvatar` API call (mocking Supabase client).
- **Integration Tests:**
  - Verify that selecting a file opens the modal.
  - Verify that "Cancel" closes the modal without changes.

---

## 7. Future Considerations
- Support for dragging and dropping files.
- Basic image filters (brightness/contrast).
- Handling multiple file formats (WebP).
