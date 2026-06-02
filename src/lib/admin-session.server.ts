import { useSession } from "@tanstack/react-start/server";

const rawPassword = process.env.ADMIN_PASSWORD ?? "change-me-please-min-32chars!!!!!";
// Session library requires >=32 chars
const sessionPassword = (rawPassword + "ooredoo-survey-session-secret-padding").slice(0, 64);

export interface AdminSessionData {
  isAdmin?: boolean;
  loggedAt?: number;
}

export function getAdminSession() {
  return useSession<AdminSessionData>({
    password: sessionPassword,
    name: "ooredoo-admin",
    maxAge: 60 * 60 * 8, // 8h
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    },
  });
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  }
  return diff === 0;
}
