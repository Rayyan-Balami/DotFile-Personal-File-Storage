import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFolder extends Document {
  _id: Types.ObjectId;
  name: string;
  type: "folder";
  owner: Types.ObjectId;
  color: string;
  parent: Types.ObjectId | null;
  items: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const FolderSchema = new Schema<IFolder>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["folder"], default: "folder" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String, default: "#4f46e5" },
    parent: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    items: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Folder = mongoose.model<IFolder>("Folder", FolderSchema);
