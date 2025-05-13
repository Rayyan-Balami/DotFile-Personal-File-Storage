import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFile extends Document {
  _id: Types.ObjectId;
  name: string;
  type: string;
  size: number;
  owner: Schema.Types.ObjectId;
  folder: Schema.Types.ObjectId | null; // Virtual folder reference
  storageKey: string; // The actual filename in storage
  path: string; // Full path including any original path from ZIP if applicable
  pathSegments: { name: string; id: Schema.Types.ObjectId }[];
  extension: string;
  isPinned: boolean;
    publicShare: Schema.Types.ObjectId | null;
  userShare: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const FileSchema = new Schema<IFile>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    folder: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    storageKey: { type: String, required: true },
    path: { type: String, required: true }, // Full path including any original path from ZIP if applicable
    pathSegments: [
      {
        name: String,
        id: { type: Schema.Types.ObjectId },
      },
    ],
    extension: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    publicShare: { type: Schema.Types.ObjectId, ref: "PublicShare", default: null },
    userShare: { type: Schema.Types.ObjectId, ref: "UserShare", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const File = mongoose.model<IFile>("File", FileSchema);

export default File;
