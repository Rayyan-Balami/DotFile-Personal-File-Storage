import { IUser } from "@api/user/user.model.js";
import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * File document interface extending Mongoose Document
 */
export interface IFile extends Document {
  /** MongoDB ObjectId */
  _id: Types.ObjectId;
  /** File name without extension */
  name: string;
  /** MIME type of the file */
  type: string;
  /** File size in bytes */
  size: number;
  /** User who owns the file */
  owner: Schema.Types.ObjectId | IUser;
  /** Parent folder ID (null for root level) */
  folder: Schema.Types.ObjectId | null;
  /** Unique storage key for encrypted file */
  storageKey: string;
  /** File extension without dot */
  extension: string;
  /** Whether file is pinned by user */
  isPinned: boolean;
  /** File creation timestamp */
  createdAt: Date;
  /** File last update timestamp */
  updatedAt: Date;
  /** Soft deletion timestamp (null if not deleted) */
  deletedAt: Date | null;
}

/**
 * Mongoose schema for File documents with validation and references
 */
const FileSchema = new Schema<IFile>(
  {
    /** File name without extension */
    name: { type: String, required: true },
    /** MIME type of the file */
    type: { type: String, required: true },
    /** File size in bytes */
    size: { type: Number, required: true },
    /** Reference to User who owns the file */
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Reference to parent Folder (null for root level) */
    folder: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    /** Unique storage key for encrypted file */
    storageKey: { type: String, required: true },
    /** File extension without dot */
    extension: { type: String, required: true },
    /** Whether file is pinned by user */
    isPinned: { type: Boolean, default: false },
    /** Soft deletion timestamp (null if not deleted) */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * Mongoose model for File documents
 */
const File = mongoose.model<IFile>("File", FileSchema);

export default File;
