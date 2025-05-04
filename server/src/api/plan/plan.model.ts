import mongoose, { Document, Schema } from "mongoose";

// Define the plan interface
export interface IPlan extends Document {
  name: string;
  storageLimit: number; //in bytes
  price: number;
  description: string;
  features: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Create the schema
const PlanSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    storageLimit: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    features: {
      type: [String],
      required: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
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

// Create and export the model
const Plan = mongoose.model<IPlan>("Plan", PlanSchema);
export default Plan;
