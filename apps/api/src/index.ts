import { loadEnv } from "./env";
import { startServer } from "./server";

startServer(loadEnv());
