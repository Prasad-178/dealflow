import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      companyId: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId?: string;
    role?: string;
  }
}
