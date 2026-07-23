import mongoose from "mongoose";

let memoryServer: import("mongodb-memory-server").MongoMemoryServer | undefined;

export async function connectDB(): Promise<void> {
  const useMemoryDb = process.env.USE_MEMORY_DB === "true";

  let uri = process.env.MONGODB_URI;

  if (useMemoryDb || !uri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log("[db] Using in-memory MongoDB for local development.");
    console.log("[db] Set MONGODB_URI in .env (e.g. a MongoDB Atlas connection string) for persistent storage.");
  }

  await mongoose.connect(uri);
  console.log(`[db] Connected to MongoDB (${memoryServer ? "in-memory" : "configured URI"}).`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
