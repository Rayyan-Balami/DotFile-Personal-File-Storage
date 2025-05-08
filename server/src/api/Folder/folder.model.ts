import mongoose, { Document, Schema } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  type: 'folder';
  owner: Schema.Types.ObjectId;
  workspace: Schema.Types.ObjectId | null;
  parent: Schema.Types.ObjectId | null;
  path: string; // Virtual logical path for display/navigation
  pathSegments: { name: string; id: Schema.Types.ObjectId }[]; // For breadcrumb navigation
  items: number;
  pinned: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const FolderSchema = new Schema<IFolder>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['folder'], default: 'folder' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    parent: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    path: { type: String, required: true },
    pathSegments: [
      {
        name: String,
        id: { type: Schema.Types.ObjectId, ref: 'Folder', required: true }
      }
    ],
    items: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Folder = mongoose.model<IFolder>('Folder', FolderSchema);
