import mongoose, { Document, Schema } from "mongoose";
import { IPublicSharePermission, IUserSharePermission } from "./share.dto.js";

export interface IPublicShare extends Document {
  fileSystemItem: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  shareId: string; // unique link ID
  permission: IPublicSharePermission;
  expiresAt?: Date; // optional expiration date
  password?: string; // optional password for access
  ipAddress?: string[]; // optional IP address for access
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserShare extends Document {
  fileSystemItem: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  permission: IUserSharePermission;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PublicShareSchema = new Schema({
  fileSystemItem: {
    type: Schema.Types.ObjectId,
    ref: 'FileSystemItem',
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shareId: {
    type: String,
    required: true,
    unique: true,
  },
  permission: {
    type: String,
    enum: Object.values(IPublicSharePermission),
    default: IPublicSharePermission.RESTRICTED,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  password: {
    type: String,
    default: null,
  },
  ipAddress: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

const UserShareSchema = new Schema({
  fileSystemItem: {
    type: Schema.Types.ObjectId,
    ref: 'FileSystemItem',
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
}, { timestamps: true });

// Indexes for performance
PublicShareSchema.index({ fileSystemItem: 1, owner: 1 });
UserShareSchema.index({ fileSystemItem: 1, owner: 1, userId: 1 });

const PublicShare = mongoose.model<IPublicShare>('PublicShare', PublicShareSchema);
const UserShare = mongoose.model<IUserShare>('UserShare', UserShareSchema);

export { PublicShare, UserShare };
