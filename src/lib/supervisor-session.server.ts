import { useSession } from "@tanstack/react-start/server";

const rawPassword = process.env.ADMIN_PASSWORD ?? "change-me-please-min-32chars!!!!!";
const sessionPassword = (rawPassword + "ooredoo-supervisor-session-secret-padding").slice(0, 64);

export interface SupervisorSessionData {
  username?: string;
  loggedAt?: number;
}

export function getSupervisorSession() {
  return useSession<SupervisorSessionData>({
    password: sessionPassword,
    name: "ooredoo-supervisor",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    },
  });
}
