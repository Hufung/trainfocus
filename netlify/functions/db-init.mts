import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
  try {
    const sql = neon();

    // Create users table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index on email for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `;

    return new Response(JSON.stringify({
      success: true,
      message: "Database initialized successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Database initialization error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Database initialization failed"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export const config: Config = {
  path: "/api/db-init"
};
