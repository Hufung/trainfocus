import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

// Simple hash function for passwords (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { action, username, email, password } = body;

    const sql = neon();

    // Ensure users table exists
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    if (action === "register") {
      // Validate required fields
      if (!username || !email || !password) {
        return new Response(JSON.stringify({
          success: false,
          error: "Username, email, and password are required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validate email format (basic check for Gmail or any email)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid email format"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validate password length
      if (password.length < 6) {
        return new Response(JSON.stringify({
          success: false,
          error: "Password must be at least 6 characters"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Check if email already exists
      const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existingUser.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "An account with this email already exists"
        }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const result = await sql`
        INSERT INTO users (username, email, password_hash)
        VALUES (${username}, ${email}, ${passwordHash})
        RETURNING id, username, email, created_at
      `;

      const newUser = result[0];
      return new Response(JSON.stringify({
        success: true,
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        }
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });

    } else if (action === "login") {
      // Validate required fields
      if (!email || !password) {
        return new Response(JSON.stringify({
          success: false,
          error: "Email and password are required"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Find user by email
      const users = await sql`SELECT id, username, email, password_hash FROM users WHERE email = ${email}`;
      if (users.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid email or password"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const user = users[0];

      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid email or password"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid action. Use 'register' or 'login'"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (error) {
    console.error("Auth error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "An error occurred. Please try again."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export const config: Config = {
  path: "/api/auth"
};
