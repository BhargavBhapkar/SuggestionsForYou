import { Schema, model, type Model, type HydratedDocument, type Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAddress {
  _id?: Types.ObjectId;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  addresses: IAddress[];
  wishlist: Types.ObjectId[];
  createdAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const addressSchema = new Schema<IAddress>({
  label: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  addresses: { type: [addressSchema], default: [] },
  wishlist: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
  createdAt: { type: Date, default: () => new Date() },
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export type UserDoc = HydratedDocument<IUser, IUserMethods>;
export default model<IUser, UserModel>("User", userSchema);
