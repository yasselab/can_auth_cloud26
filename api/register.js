import bcrypt from "bcryptjs";
import { Sequelize, DataTypes } from "sequelize";

// ⚠️ pool n'est PAS utilisé ici, mais on le garde si tu veux l'utiliser ailleurs
import pool from "../lib/db.js";

/**
 * =========================
 * DB CONNECTION (Postgres)
 * =========================
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

/**
 * =========================
 * USER MODEL
 * =========================
 */
const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM("ADMIN", "VOLUNTEER"),
      defaultValue: "VOLUNTEER"
    }
  },
  {
    tableName: "users",
    timestamps: true
  }
);

/**
 * =========================
 * API HANDLER
 * =========================
 */
export default async function handler(req, res) {
  // 🔎 DEBUG LOGS (CRITIQUE POUR VERCEL)
  console.log("REGISTER called");
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { name, email, password, role } = req.body || {};

    // 🔒 Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "name, email and password are required"
      });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 💾 Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "VOLUNTEER"
    });

    // 📧 CALL GCP FaaS (PUBLIC – sans clé)
    try {
      await fetch(
        "https://can-notify-welcome-39985935336.europe-west1.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        }
      );
    } catch (mailError) {
      console.error("⚠️ Email service error:", mailError.message);
      // on ne bloque PAS l'inscription si l'email échoue
    }

    return res.status(201).json({
      ok: true,
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    // ❌ DEBUG LOG COMPLET
    console.error("REGISTER ERROR:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Email already exists" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
}
