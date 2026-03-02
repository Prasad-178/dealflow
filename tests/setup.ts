import { config } from "dotenv";

// Load .env so integration tests get OPENAI_API_KEY etc.
config();

// DATABASE_URL fallback is also set in vitest.config.ts
