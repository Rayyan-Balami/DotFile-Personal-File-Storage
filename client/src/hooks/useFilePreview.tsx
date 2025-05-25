import * as React from 'react';
import fileApi from '../api/file/file.api';
import { ImagePreview } from '@/components/previews/ImagePreview';

// Helper preview components

function VideoPreview({ fileId }: { fileId: string }) {
  const fileUrl = fileApi.getFileUrl(fileId);
  return <video src={fileUrl} controls className="max-w-full" />;
}

function PdfPreview({ fileId }: { fileId: string }) {
  const fileUrl = fileApi.getFileUrl(fileId);
  return <iframe src={fileUrl} className="w-full h-screen" />;
}

function UnsupportedPreview() {
  return <p className="text-sm text-gray-500">No preview available for this file type.</p>;
}

// Main hook
interface UseFilePreviewProps {
  fileId: string;
  mimeType: string;
}

export function useFilePreview({ fileId, mimeType }: UseFilePreviewProps): React.ReactElement | null {
  if (mimeType.startsWith('image/')) {
    return <ImagePreview fileId={fileId} />;
  } else if (mimeType.startsWith('video/')) {
    return <VideoPreview fileId={fileId} />;
  } else if (mimeType === 'application/pdf') {
    return <PdfPreview fileId={fileId} />;
  } else {
    return <UnsupportedPreview />;
  }
}
