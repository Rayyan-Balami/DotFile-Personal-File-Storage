import mongoose, { Document, Schema } from "mongoose";
import { IPublicSharePermission, IUserSharePermission } from "./share.dto.js";

export interface IPublicShare extends Document {
  resource: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  link: string; // unique link
  permission: IPublicSharePermission;
  allowDownload: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserShare extends Document {
  resource: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  sharedWith: {
    userId: Schema.Types.ObjectId;
    permission: IUserSharePermission;
    allowDownload: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const PublicShareSchema = new Schema({
  resource: {
    type: Schema.Types.ObjectId,
    ref: 'FileSystemItem',
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  link: {
    type: String,
    required: true,
    unique: true,
  },
  permission: {
    type: String,
    enum: Object.values(IPublicSharePermission),
    default: IPublicSharePermission.RESTRICTED,
  },
  allowDownload: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const UserShareSchema = new Schema({
  resource: {
    type: Schema.Types.ObjectId,
    ref: 'FileSystemItem',
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sharedWith: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      enum: Object.values(IUserSharePermission),
      default: IUserSharePermission.VIEWER,
    },
    allowDownload: {
      type: Boolean,
      default: false,
    },
  }],
}, { timestamps: true });

// Indexes for performance
PublicShareSchema.index({ resource: 1, owner: 1 });
UserShareSchema.index({ resource: 1, owner: 1, 'sharedWith.userId': 1 });

const PublicShare = mongoose.model<IPublicShare>('PublicShare', PublicShareSchema);
const UserShare = mongoose.model<IUserShare>('UserShare', UserShareSchema);

export { PublicShare, UserShare };
