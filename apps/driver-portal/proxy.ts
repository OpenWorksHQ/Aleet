import { NextRequest, NextResponse } from "next/server";
import {
  fetchAdminPermissions,
  getAdminFallbackPath,
  getRequiredAdminPermission,
  hasAdminPermission,
} from "@/lib/admin-access";

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
  const token = request.cookies.get("auth_token")?.value ?? null;
  const role = request.cookies.get("auth_role")?.value ?? null;

  const isAuthenticated = Boolean(token && role);
  const driverStatus = request.cookies.get("driver_status")?.value ?? "";
  const canAccessDashboard = DASHBOARD_STATUSES.has(driverStatus);
  const isFullyApproved =
    driverStatus === "active" || driverStatus === "approved";

  // Root route — redirect based on role/status
  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role === "driver") {
      if (driverStatus === "rejected") {
        return NextResponse.redirect(new URL("/rejected", request.url));
      }
      const dest = canAccessDashboard ? "/driver" : "/pending";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already logged-in user visiting /login → send to their dashboard
  if (pathname === "/login" && isAuthenticated) {
    if (role === "driver") {
      if (driverStatus === "rejected") {
        return NextResponse.redirect(new URL("/rejected", request.url));
      }
      const dest = canAccessDashboard ? "/driver" : "/pending";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    const dest = role === "admin" ? "/admin" : "/driver";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // /rejected — only authenticated rejected drivers
  if (pathname.startsWith("/rejected")) {
    if (!isAuthenticated || role !== "driver") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (driverStatus !== "rejected") {
      const dest = canAccessDashboard ? "/driver" : "/pending";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // /pending — only authenticated pending drivers who can't access dashboard
  if (pathname.startsWith("/pending")) {
    if (!isAuthenticated || role !== "driver") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (driverStatus === "rejected") {
      return NextResponse.redirect(new URL("/rejected", request.url));
    }
    if (canAccessDashboard) {
      return NextResponse.redirect(new URL("/driver", request.url));
    }
  }

  // /admin/* — only "admin" role
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "admin") {
      const dest = role === "driver" ? "/driver" : "/login";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    const requiredPermission = getRequiredAdminPermission(pathname);
    if (requiredPermission) {
      const permissions = await fetchAdminPermissions(token ?? "");
      if (!hasAdminPermission(permissions, requiredPermission)) {
        return NextResponse.redirect(
          new URL(getAdminFallbackPath(permissions), request.url),
        );
      }
    }
  }

  // /driver/* — only "driver" role
  if (pathname.startsWith("/driver")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "driver") {
      const dest = role === "admin" ? "/admin" : "/login";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // Rejected drivers go to /rejected
    if (driverStatus === "rejected") {
      return NextResponse.redirect(new URL("/rejected", request.url));
    }

    // Drivers without dashboard access go to /pending
    if (!canAccessDashboard) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // Non-fully-approved drivers can only access onboarding and profile
    if (!isFullyApproved) {
      const isAllowed = RESTRICTED_ALLOWED_PATHS.some((p) =>
        pathname.startsWith(p),
      );
      if (!isAllowed) {
        return NextResponse.redirect(
          new URL("/driver/onboarding", request.url),
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
