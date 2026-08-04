import { NextRequest, NextResponse } from "next/server";
import {
  getAdminFallbackPath,
  getRequiredAdminPermission,
  hasAdminPermission,
} from "@/lib/admin-access";
import {
  AUTH_TOKEN_COOKIE,
  LEGACY_DRIVER_STATUS_COOKIE,
  LEGACY_ROLE_COOKIE,
} from "@/lib/auth";
import { getSession } from "@/lib/session";

// Statuses that may access the driver dashboard
const DASHBOARD_STATUSES = new Set([
  "active",
  "approved",
  "background_completed",
  "needs_revision",
  "revision_complete",
]);

// Routes accessible even without full approval (restricted mode)
const RESTRICTED_ALLOWED_PATHS = ["/driver/onboarding", "/driver/profile"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value ?? null;

  // Role and driver status are resolved from the backend using the token —
  // never from cookies, which client JS can forge.
  const result = await getSession(token);
  const session = result.status === "authenticated" ? result.session : null;

  const isAuthenticated = session !== null;
  const role = session?.role ?? null;
  const driverStatus = session?.driverStatus ?? "";
  const canAccessDashboard = DASHBOARD_STATUSES.has(driverStatus);
  const isFullyApproved =
    driverStatus === "active" || driverStatus === "approved";

  // A token the backend rejected is dead weight — drop it (plus any legacy
  // role/status cookies) so the user lands in a clean signed-out state.
  // "unavailable" (backend down) deliberately keeps the cookie: we fail closed
  // for this request but the session survives a transient outage.
  const hasStaleToken = token !== null && result.status === "anonymous";

  const finish = (response: NextResponse): NextResponse => {
    if (hasStaleToken) {
      for (const name of [
        AUTH_TOKEN_COOKIE,
        LEGACY_ROLE_COOKIE,
        LEGACY_DRIVER_STATUS_COOKIE,
      ]) {
        response.cookies.set(name, "", { path: "/", maxAge: 0 });
      }
    }
    return response;
  };

  const redirect = (path: string): NextResponse =>
    finish(NextResponse.redirect(new URL(path, request.url)));

  // Root route — redirect based on role/status
  if (pathname === "/") {
    if (!isAuthenticated) {
      return redirect("/login");
    }
    if (role === "admin") {
      return redirect("/admin");
    }
    if (role === "driver") {
      if (driverStatus === "rejected") {
        return redirect("/rejected");
      }
      return redirect(canAccessDashboard ? "/driver" : "/pending");
    }
    return redirect("/login");
  }

  // Already logged-in user visiting /login → send to their dashboard
  if (pathname === "/login" && isAuthenticated) {
    if (role === "driver") {
      if (driverStatus === "rejected") {
        return redirect("/rejected");
      }
      return redirect(canAccessDashboard ? "/driver" : "/pending");
    }
    return redirect(role === "admin" ? "/admin" : "/driver");
  }

  // /rejected — only authenticated rejected drivers
  if (pathname.startsWith("/rejected")) {
    if (!isAuthenticated || role !== "driver") {
      return redirect("/login");
    }
    if (driverStatus !== "rejected") {
      return redirect(canAccessDashboard ? "/driver" : "/pending");
    }
  }

  // /pending — only authenticated pending drivers who can't access dashboard
  if (pathname.startsWith("/pending")) {
    if (!isAuthenticated || role !== "driver") {
      return redirect("/login");
    }
    if (driverStatus === "rejected") {
      return redirect("/rejected");
    }
    if (canAccessDashboard) {
      return redirect("/driver");
    }
  }

  // /admin/* — only "admin" role
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return redirect("/login");
    }
    if (role !== "admin") {
      return redirect(role === "driver" ? "/driver" : "/login");
    }

    const requiredPermission = getRequiredAdminPermission(pathname);
    if (requiredPermission) {
      const permissions = session.adminPermissions;
      if (!hasAdminPermission(permissions, requiredPermission)) {
        return redirect(getAdminFallbackPath(permissions));
      }
    }
  }

  // /driver/* — only "driver" role
  if (pathname.startsWith("/driver")) {
    if (!isAuthenticated) {
      return redirect("/login");
    }
    if (role !== "driver") {
      return redirect(role === "admin" ? "/admin" : "/login");
    }

    // Rejected drivers go to /rejected
    if (driverStatus === "rejected") {
      return redirect("/rejected");
    }

    // Drivers without dashboard access go to /pending
    if (!canAccessDashboard) {
      return redirect("/pending");
    }

    // Non-fully-approved drivers can only access onboarding and profile
    if (!isFullyApproved) {
      const isAllowed = RESTRICTED_ALLOWED_PATHS.some((p) =>
        pathname.startsWith(p),
      );
      if (!isAllowed) {
        return redirect("/driver/onboarding");
      }
    }
  }

  return finish(NextResponse.next());
}

// Scoped to the routes this proxy actually decides on. Verification now costs a
// backend round-trip, so it must not run for public pages, assets or anything
// else that previously fell through to NextResponse.next().
export const config = {
  matcher: [
    "/",
    "/login",
    "/admin",
    "/admin/:path*",
    "/driver",
    "/driver/:path*",
    "/pending",
    "/pending/:path*",
    "/rejected",
    "/rejected/:path*",
  ],
};
