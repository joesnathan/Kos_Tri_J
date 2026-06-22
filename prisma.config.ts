import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://placeholder_user:placeholder_password@localhost:5432/placeholder_db?sslmode=require",
  },
});
