import mongoose, { Schema, Document, Types } from "mongoose";

// Define item type enum
export enum ItemType {
  FOLDER = 'folder',
  DOCUMENT = 'document'
}

// Define shared user interface
export interface ISharedUser {
  userId: Types.ObjectId;
  name: string;
  email: string;
  avatar: string;
  accessLevel: 'view' | 'edit' | 'owner';
}

// Base storage item interface
export interface IStorageItem {
  title: string;
  type: ItemType;
  owner: Types.ObjectId;
  parentFolder: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isPinned: boolean;
  sharedUsers: ISharedUser[];
  path: string; // Stores hierarchical path for easy navigation
}

// Document specific properties
export interface IStorageDocument extends IStorageItem {
  type: ItemType.DOCUMENT;
  fileExtension: string;
  mimeType: string;
  byteCount: number;
  filePath: string; // Path to actual file in storage system
  previewUrl: string | null;
}

// Folder specific properties
export interface IStorageFolder extends IStorageItem {
  type: ItemType.FOLDER;
  childCount: number; // Count of immediate children
}

// Path segment interface
export interface IPathSegment {
  _id: Types.ObjectId;
  title: string;
}

// Combined storage interface for the model
export interface IStorage extends Document {
  title: string;
  type: ItemType;
  owner: Types.ObjectId;
  parentFolder: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isPinned: boolean;
  sharedUsers: ISharedUser[];
  path: string;
  pathSegments: IPathSegment[];
  
  // Document specific fields (optional)
  fileExtension?: string;
  mimeType?: string;
  byteCount?: number;
  filePath?: string;
  previewUrl?: string | null;
  
  // Folder specific fields (optional)
  childCount?: number;
}

// Shared user schema
const SharedUserSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    required: true
  },
  accessLevel: {
    type: String,
    enum: ['view', 'edit', 'owner'],
    default: 'view'
  }
}, { _id: false });

// Create schema
const StorageSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(ItemType),
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentFolder: {
      type: Schema.Types.ObjectId,
      ref: 'Storage',
      default: null,
      index: true,
    },
    path: {
      type: String,
      required: true,
      index: true,
    },
    pathSegments: [{
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Storage'
      },
      title: String
    }],
    isPinned: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true, // Index for trash queries
    },
    sharedUsers: [SharedUserSchema],
    
    // Document specific fields
    fileExtension: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
    },
    byteCount: {
      type: Number,
      default: 0,
    },
    filePath: {
      type: String,
    },
    previewUrl: {
      type: String,
      default: null,
    },
    
    // Folder specific fields
    childCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Compound indices for efficient queries
StorageSchema.index({ owner: 1, deletedAt: 1 });
StorageSchema.index({ owner: 1, parentFolder: 1, deletedAt: 1 });
StorageSchema.index({ owner: 1, isPinned: 1 });

// Virtual for shared users preview (limited to first few users)
StorageSchema.virtual('sharedUsersPreview').get(function(this: IStorage) {
  if (!this.sharedUsers || !Array.isArray(this.sharedUsers)) {
    return [];
  }
  
  return this.sharedUsers.slice(0, 3).map(user => ({
    id: user.userId,
    name: user.name,
    image: user.avatar
  }));
});

// Pre-save middleware to create path and pathSegments
StorageSchema.pre<IStorage>('save', async function(next) {
  if (this.isModified('parentFolder') || this.isModified('title') || this.isNew) {
    if (!this.parentFolder) {
      // Root level item
      this.path = `/${this.title}`;
      this.pathSegments = [];  // Empty at root level
    } else {
      const parent = await mongoose.model('Storage').findById(this.parentFolder);
      if (parent) {
        // Update path string
        this.path = `${parent.path}/${this.title}`;
        
        // Build pathSegments array
        this.pathSegments = [
          ...(parent.pathSegments || []),
          {
            _id: parent._id,
            title: parent.title
          }
        ];
      }
    }
  }
  next();
});

// Pre-remove middleware to handle child items
StorageSchema.pre<IStorage>('deleteOne', { document: true, query: false }, async function(next) {
  if (this.type === ItemType.FOLDER) {
    // Find and update or remove child items
    const childItems = await mongoose.model('Storage').find({ parentFolder: this._id });
    
    // Process each child (either update parentFolder or remove)
    for (const item of childItems) {
      await item.deleteOne();
    }
  }
  next();
});

// Create and export the model
const Storage = mongoose.model<IStorage>('Storage', StorageSchema);
export default Storage;