import mongoose, { Schema, Document } from "mongoose";
import {
  ACCESS_TOKEN_EXPIRY,
  ACCESS_TOKEN_SECRET,
  DEFAULT_USER_AVATAR,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_SECRET,
} from "../../constants.js";
import bcryptjs from "bcryptjs";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

// Define the user interface
export interface IUser extends Document {
  avatar: string;
  fullName: string;
  email: string;
  password: string;
  plan: mongoose.Schema.Types.ObjectId;
  storageUsed: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // Add deletedAt field
}

// Create the schema
const UserSchema: Schema = new Schema(
  {
    avatar: {
      type: String,
      required: false,
      default: DEFAULT_USER_AVATAR,
    },
    fullName: {
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
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    storageUsed: {
      type: Number,
      default: 0,
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
  const payload = { id: this._id, email: this.email, fullName: this.fullName };
  const secret: Secret = ACCESS_TOKEN_SECRET;
  const options: jwt.SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  };

  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign(payload, secret, options);
};

// Add a method to generate refresh token
UserSchema.methods.generateRefreshToken = function () {
  const payload = { id: this._id, email: this.email, fullName: this.fullName };
  const secret: Secret = REFRESH_TOKEN_SECRET;
  const options: jwt.SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  };
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }
  return jwt.sign(payload, secret, options);
};

// Create and export the model
const User = mongoose.model<IUser>("User", UserSchema);

export default User;
