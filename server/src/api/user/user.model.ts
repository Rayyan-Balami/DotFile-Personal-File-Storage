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
import mongoose, { Document, Schema } from "mongoose";

// Define the refresh token interface
interface IRefreshToken {
  token: string;
  deviceInfo: string;
  createdAt: Date;
}

// Define interface for User methods
interface IUserMethods {
  checkPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(deviceInfo: string): string;
  findRefreshToken(token: string): IRefreshToken | undefined;
  removeRefreshToken(token: string): boolean;
}

// Define the user interface
export interface IUser extends Document, IUserMethods {
  _id: string; // MongoDB ObjectId
  avatar: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  plan: Schema.Types.ObjectId;
  storageUsed: number;
  refreshTokens: IRefreshToken[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Create the refresh token schema
const RefreshTokenSchema = new Schema({
  token: { //stores the refresh token
    type: String,
    required: true,
  },
  deviceInfo: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

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
    plan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    refreshTokens: {
      type: [RefreshTokenSchema],
      default: [],
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
UserSchema.methods.generateRefreshToken = function (deviceInfo: string) {
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

// Add a method to find a refresh token
UserSchema.methods.findRefreshToken = function (token: string) {
  return this.refreshTokens.find((rt: IRefreshToken) => rt.token === token);
};

// Add a method to remove a refresh token
UserSchema.methods.removeRefreshToken = function (token: string) {
  const initialLength = this.refreshTokens.length;
  this.refreshTokens = this.refreshTokens.filter((rt: IRefreshToken) => rt.token !== token);
  return this.refreshTokens.length < initialLength;
};

// Create and export the model
const User = mongoose.model<IUser>("User", UserSchema);

export default User;
