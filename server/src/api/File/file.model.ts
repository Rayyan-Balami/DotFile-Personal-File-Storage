import { IUser } from "@api/user/user.model.js";
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFile extends Document {
  _id: Types.ObjectId;
  name: string;
  type: string;
  size: number;
  owner: Schema.Types.ObjectId | IUser;
  folder: Schema.Types.ObjectId | null;
  storageKey: string;
  extension: string;
  isPinned: boolean;
  hasPreview: boolean;
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
    extension: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    hasPreview: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const File = mongoose.model<IFile>("File", FileSchema);

export default File;
