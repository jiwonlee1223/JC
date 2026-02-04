// Firebase Storage 유틸리티
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  type UploadResult,
  type UploadTask,
  type StorageReference,
} from 'firebase/storage';
import { storage } from './firebase';

// 파일 업로드 (단순)
export const uploadFile = async (
  path: string,
  file: File | Blob
): Promise<{ url: string; ref: StorageReference }> => {
  const storageRef = ref(storage, path);
  const result: UploadResult = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(result.ref);
  
  return { url, ref: result.ref };
};

// 파일 업로드 (진행률 콜백 포함)
export const uploadFileWithProgress = (
  path: string,
  file: File | Blob,
  onProgress?: (progress: number) => void,
  onComplete?: (url: string) => void,
  onError?: (error: Error) => void
): UploadTask => {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  uploadTask.on(
    'state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress?.(progress);
    },
    (error) => {
      onError?.(error);
    },
    async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      onComplete?.(url);
    }
  );
  
  return uploadTask;
};

// 다운로드 URL 가져오기
export const getFileURL = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

// 파일 삭제
export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  return deleteObject(storageRef);
};

// 폴더 내 파일 목록 가져오기
export const listFiles = async (
  path: string
): Promise<{ name: string; fullPath: string }[]> => {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  
  return result.items.map((item) => ({
    name: item.name,
    fullPath: item.fullPath,
  }));
};

// 유저별 파일 경로 생성 헬퍼
export const getUserFilePath = (
  userId: string,
  folder: string,
  fileName: string
): string => {
  return `users/${userId}/${folder}/${fileName}`;
};

// 고유한 파일명 생성 (타임스탬프 + 원본명)
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  
  return `${baseName}_${timestamp}_${randomStr}.${extension}`;
};
