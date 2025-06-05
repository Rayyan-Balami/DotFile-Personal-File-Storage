import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Folder document with hierarchy and metadata
 */
export interface IFolder extends Document {
  _id: Types.ObjectId;
  name: string;
  type: "folder";
  owner: Types.ObjectId;
  color: string;
  parent: Types.ObjectId | null;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * MongoDB schema for folder data
 */
const FolderSchema = new Schema<IFolder>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["folder"], default: "folder" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String, default: "default" },
    parent: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    isPinned: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * Folder model for database operations
 */
export const Folder = mongoose.model<IFolder>("Folder", FolderSchema);
