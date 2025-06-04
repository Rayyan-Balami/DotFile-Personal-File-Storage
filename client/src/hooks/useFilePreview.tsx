import * as React from 'react';
import fileApi from '../api/file/file.api';
import { ImagePreview } from '@/components/previews/ImagePreview';

// Helper preview components

function VideoPreview({ fileId }: { fileId: string }) {
  const fileUrl = fileApi.getFileUrl(fileId);
  return (
    <video 
      src={fileUrl} 
      controls 
      className="max-w-full max-h-full rounded-lg"
    >
      Your browser does not support the video tag.
    </video>
  );
}

function PdfPreview({ fileId }: { fileId: string }) {
  const fileUrl = fileApi.getFileUrl(fileId);
  return (
    <iframe 
      src={fileUrl} 
      className="w-full h-full rounded-lg"
      title="PDF Preview"
    />
  );
}

function AudioPreview({ fileId }: { fileId: string }) {
  const fileUrl = fileApi.getFileUrl(fileId);
  return (
    <div className="flex flex-col items-center justify-center h-full bg-green-50 rounded-lg">
      <p className="text-lg font-medium text-green-700 mb-4">Audio File</p>
      <audio controls className="max-w-full">
        <source src={fileUrl} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
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
  } else if (mimeType.startsWith('audio/')) {
    return <AudioPreview fileId={fileId} />;
  } else {
    return <UnsupportedPreview />;
  }
}
