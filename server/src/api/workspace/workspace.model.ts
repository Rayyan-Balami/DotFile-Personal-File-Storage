import mongoose, { Document, Schema, Types } from "mongoose";

export interface IWorkspace extends Document {
  _id: Types.ObjectId;
  name: string;
  owner: Types.ObjectId;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}


const WorkspaceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    color: {
      type: String,
      default: "#4f46e5",
    },
    icon: {
      type: String,
      default: "folder",
    },
  },
  {
    timestamps: true,
  }
);

WorkspaceSchema.index({ owner: 1, name: 1 });

const Workspace = mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);

export default Workspace;
