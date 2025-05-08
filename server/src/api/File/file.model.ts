import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  name: string;
  type: 'document';
  owner: Schema.Types.ObjectId;
  workspace: Schema.Types.ObjectId;
  parent: Schema.Types.ObjectId | null;
  path: string;
  pathSegments: { name: string; id: Schema.Types.ObjectId }[];
  size: number; // in bytes
  mimeType: string;
  extension: string;
  storageLocation: string;
  pinned: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const FileSchema = new Schema<IFile>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['document'], default: 'document' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace' },
    parent: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    path: { type: String, required: true },
    pathSegments: [
      {
        name: String,
        id: { type: Schema.Types.ObjectId }
      }
    ],
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    extension: { type: String, required: true },
    storageLocation: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const File = mongoose.model<IFile>('File', FileSchema);
