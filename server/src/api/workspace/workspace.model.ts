import mongoose, { Document, Schema } from "mongoose";

export interface IWorkspace extends Document {
  name: string;
  owner: Schema.Types.ObjectId;
  color: string;
  icon: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const WorkspaceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  color: {
    type: String,
    default: '#4f46e5' // A default indigo color
  },
  icon: {
    type: String,
    default: 'folder' // Default icon name
  },
  description: {
    type: String,
    trim: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
WorkspaceSchema.index({ owner: 1, name: 1 });

const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

export default Workspace;