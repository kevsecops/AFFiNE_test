export interface AttachmentFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface IgnoredDoc {
  docId: string;
  createdAt: string;
}
