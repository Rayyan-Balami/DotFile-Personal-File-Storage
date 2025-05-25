import { JwtUserPayload, UserRole } from "@api/user/user.dto.js";
import {
  ACCESS_TOKEN_EXPIRY,
  ACCESS_TOKEN_SECRET,
  DEFAULT_USER_AVATAR_URL,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_SECRET,
} from "@config/constants.js";
import bcryptjs from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import mongoose, { Document, Schema, Types } from "mongoose";

// Define interface for User methods
interface IUserMethods {
  checkPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

// Define the user interface
export interface IUser extends Document, IUserMethods {
  _id: Types.ObjectId;
  avatar: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  storageUsed: number;
  maxStorageLimit: number;
  refreshToken: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Create the schema
const UserSchema: Schema = new Schema(
  {
    avatar: {
      type: String,
      required: false,
      default: DEFAULT_USER_AVATAR_URL,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    maxStorageLimit: {
      type: Number,
      default: 15728640, // 15MB in bytes (15 * 1024 * 1024)
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add a pre-save hook to set password hash
UserSchema.pre<IUser>("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcryptjs.hash(this.password, 10);
  }
  next();
});

// Add a method to check password
UserSchema.methods.checkPassword = async function (password: string) {
  return await bcryptjs.compare(password, this.password);
};

// Add a method to generate access token
UserSchema.methods.generateAccessToken = function () {
  const payload: JwtUserPayload = {
    id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    iat: Math.floor(Date.now() / 1000),
  };
  const secret: Secret = ACCESS_TOKEN_SECRET;
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"],
  };

  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign(payload, secret, options);
};

// Add a method to generate refresh token
UserSchema.methods.generateRefreshToken = function () {
  const payload: JwtUserPayload = {
    id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    iat: Math.floor(Date.now() / 1000),
  };
  const secret: Secret = REFRESH_TOKEN_SECRET;
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"],
  };
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }
  return jwt.sign(payload, secret, options);
};

// Create and export the model
const User = mongoose.model<IUser>("User", UserSchema);

export default User;
