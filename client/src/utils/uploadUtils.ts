import { VITE_ZIP_NAME_PREFIX } from "@/config/constants";
import JSZip from "jszip";

/**
 * Options for folder upload
 */
export interface UploadOptions {
  onProgress?: (progress: number) => void;
  parentId?: string | null;
}

/**
 * File entry for zip creation
 */
export interface FileEntry {
  file: File;
  path: string;
}

/**
 * Creates a zip file from a folder structure
 * @param files Array of files with their relative paths
 * @param folderName Name of the root folder
 * @param onProgress Optional progress callback
 * @returns Promise<File> - The created zip file
 */
export async function createZipFromFiles(
  files: FileEntry[],
  folderName: string,
  onProgress?: (progress: number) => void
): Promise<File> {
  const zip = new JSZip();

  // Add all files to the zip
  for (let i = 0; i < files.length; i++) {
    const { file, path } = files[i];
    zip.file(path, file);

    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + 1) / files.length) * 50); // 50% for adding files
      onProgress(progress);
    }
  }

  // Generate the zip blob
  const blob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      // Report progress for zip generation (50-100%)
      if (onProgress) {
        const progress = 50 + Math.round(metadata.percent / 2);
        onProgress(progress);
      }
    }
  );

  // Create a File object with the zip prefix
  const zipFileName = `${VITE_ZIP_NAME_PREFIX}${folderName}.zip`;
  return new File([blob], zipFileName, { type: "application/zip" });
}

/**
 * Processes FileSystemEntry and creates zip if it's a directory
 * @param entry FileSystemEntry (file or directory)
 * @param options Upload options
 * @returns Promise<File[]> - Array of files to upload
 */
export async function processFileSystemEntry(
  entry: FileSystemEntry,
  options: UploadOptions = {}
): Promise<File[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve, reject) => {
      fileEntry.file(
        (file) => resolve([file]),
        (error) => reject(error)
      );
    });
  } else {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const files = await collectFilesFromDirectory(dirEntry);

    if (files.length === 0) {
      return [];
    }

    const zipFile = await createZipFromFiles(
      files,
      dirEntry.name,
      options.onProgress
    );
    return [zipFile];
  }
}

/**
 * Recursively collects all files from a directory
 * @param dirEntry FileSystemDirectoryEntry
 * @param basePath Base path for the zip structure
 * @returns Promise<FileEntry[]> - Array of file entries with paths
 */
export async function collectFilesFromDirectory(
  dirEntry: FileSystemDirectoryEntry,
  basePath: string = ""
): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  const entries = await readDirectoryEntries(dirEntry);

  for (const entry of entries) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await getFileFromEntry(fileEntry);
      files.push({ file, path: entryPath });
    } else if (entry.isDirectory) {
      const subDirEntry = entry as FileSystemDirectoryEntry;
      const subFiles = await collectFilesFromDirectory(subDirEntry, entryPath);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * Reads all entries from a directory
 * @param dirEntry FileSystemDirectoryEntry
 * @returns Promise<FileSystemEntry[]>
 */
function readDirectoryEntries(
  dirEntry: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader();
    const entries: FileSystemEntry[] = [];

    function readEntries() {
      reader.readEntries((results) => {
        if (results.length) {
          entries.push(...results);
          readEntries(); // Continue reading if there are more entries
        } else {
          resolve(entries);
        }
      }, reject);
    }

    readEntries();
  });
}

/**
 * Gets File object from FileSystemFileEntry
 * @param fileEntry FileSystemFileEntry
 * @returns Promise<File>
 */
function getFileFromEntry(fileEntry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

/**
 * Processes HTML5 file input for folder upload
 * @param input HTMLInputElement with webkitdirectory attribute
 * @param onProgress Optional progress callback for zip creation
 * @returns Promise<File[]> - Array of files to upload (zip for folders)
 */
export async function processDirectoryInput(
  input: HTMLInputElement,
  onProgress?: (folderName: string, progress: number) => void
): Promise<File[]> {
  const files = input.files;
  if (!files || files.length === 0) {
    return [];
  }

  // Group files by their root directory
  const folderMap = new Map<string, FileEntry[]>();

  for (const file of Array.from(files)) {
    const pathParts = file.webkitRelativePath.split("/");
    const rootFolder = pathParts[0];
    // Keep the full path including the root folder to preserve directory structure
    const fullPath = file.webkitRelativePath;

    if (!folderMap.has(rootFolder)) {
      folderMap.set(rootFolder, []);
    }

    folderMap.get(rootFolder)!.push({
      file,
      path: fullPath,
    });
  }

  // Create zip files for each root folder
  const zipFiles: File[] = [];
  for (const [folderName, files] of folderMap) {
    if (files.length > 0) {
      const progressCallback = onProgress
        ? (progress: number) => onProgress(folderName, progress)
        : undefined;
      const zipFile = await createZipFromFiles(
        files,
        folderName,
        progressCallback
      );
      zipFiles.push(zipFile);
    }
  }

  return zipFiles;
}

/**
 * Checks if a file is a zip file created by the frontend
 * @param fileName The name of the file
 * @returns boolean
 */
export function isZipFile(fileName: string): boolean {
  return fileName.startsWith(VITE_ZIP_NAME_PREFIX);
}

/**
 * Gets the original folder name from a zip file name
 * @param zipFileName The zip file name
 * @returns string - The original folder name
 */
export function getFolderNameFromZip(zipFileName: string): string {
  if (!isZipFile(zipFileName)) {
    return zipFileName;
  }

  const nameWithoutPrefix = zipFileName.substring(VITE_ZIP_NAME_PREFIX.length);
  return nameWithoutPrefix.replace(/\.zip$/i, "");
}
