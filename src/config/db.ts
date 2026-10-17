import dns from "node:dns";
import mongoose from "mongoose";

// Some machines point Node at a local DNS stub (127.0.0.1) that refuses the SRV lookup
// a mongodb+srv:// URI needs. DNS_SERVERS (comma-separated) overrides it, e.g. 8.8.8.8,1.1.1.1.
const dnsServers = (process.env.DNS_SERVERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

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
