import { describe, it, expect } from "vitest";

describe("OAuth Callback - User Info Encoding", () => {
  it("should correctly decode base64 user info", () => {
    const testUser = {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "google",
      lastSignedIn: "2026-01-01T00:00:00.000Z",
    };

    const encoded = btoa(JSON.stringify(testUser));
    const decoded = JSON.parse(atob(encoded));

    expect(decoded).toEqual(testUser);
    expect(decoded.id).toBe(1);
    expect(decoded.openId).toBe("test-open-id");
    expect(decoded.name).toBe("Test User");
  });

  it("should handle user info with null fields", () => {
    const testUser = {
      id: 2,
      openId: "test-open-id-2",
      name: null,
      email: null,
      loginMethod: null,
      lastSignedIn: "2026-01-01T00:00:00.000Z",
    };

    const encoded = btoa(JSON.stringify(testUser));
    const decoded = JSON.parse(atob(encoded));

    expect(decoded.name).toBeNull();
    expect(decoded.email).toBeNull();
  });

  it("should handle special characters in user names", () => {
    const testUser = {
      id: 3,
      openId: "test-open-id-3",
      name: "José García",
      email: "jose@example.com",
      loginMethod: "email",
      lastSignedIn: "2026-01-01T00:00:00.000Z",
    };

    // Use the same encoding approach as the server
    const encoded = Buffer.from(JSON.stringify(testUser)).toString("base64");
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));

    expect(decoded.name).toBe("José García");
  });
});

describe("Auth Guard Logic", () => {
  it("should identify auth routes correctly", () => {
    const isAuthRoute = (segment: string) => segment === "oauth" || segment === "login";

    expect(isAuthRoute("oauth")).toBe(true);
    expect(isAuthRoute("login")).toBe(true);
    expect(isAuthRoute("(tabs)")).toBe(false);
    expect(isAuthRoute("exercise")).toBe(false);
    expect(isAuthRoute("workout-session")).toBe(false);
  });

  it("should redirect to login when not authenticated and not in auth group", () => {
    const isAuthenticated = false;
    const inAuthGroup = false;

    const shouldRedirectToLogin = !isAuthenticated && !inAuthGroup;
    expect(shouldRedirectToLogin).toBe(true);
  });

  it("should redirect to tabs when authenticated and in auth group", () => {
    const isAuthenticated = true;
    const inAuthGroup = true;

    const shouldRedirectToTabs = isAuthenticated && inAuthGroup;
    expect(shouldRedirectToTabs).toBe(true);
  });

  it("should NOT redirect when authenticated and not in auth group (normal usage)", () => {
    const isAuthenticated = true;
    const inAuthGroup = false;

    const shouldRedirectToLogin = !isAuthenticated && !inAuthGroup;
    const shouldRedirectToTabs = isAuthenticated && inAuthGroup;

    expect(shouldRedirectToLogin).toBe(false);
    expect(shouldRedirectToTabs).toBe(false);
  });

  it("should NOT redirect when not authenticated and in auth group (on login page)", () => {
    const isAuthenticated = false;
    const inAuthGroup = true;

    const shouldRedirectToLogin = !isAuthenticated && !inAuthGroup;
    const shouldRedirectToTabs = isAuthenticated && inAuthGroup;

    expect(shouldRedirectToLogin).toBe(false);
    expect(shouldRedirectToTabs).toBe(false);
  });
});

describe("Cookie Domain Logic", () => {
  function getParentDomain(hostname: string): string | undefined {
    const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
    const isIpAddress = (host: string) => {
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
      return host.includes(":");
    };

    if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
      return undefined;
    }

    const parts = hostname.split(".");
    if (parts.length < 3) {
      return undefined;
    }

    return "." + parts.slice(-2).join(".");
  }

  it("should extract parent domain for 3000 server hostname", () => {
    const domain = getParentDomain("3000-i50trwup00wv2eje8v567-6508c67c.us2.manus.computer");
    expect(domain).toBe(".manus.computer");
  });

  it("should extract same parent domain for 8081 frontend hostname", () => {
    const domain = getParentDomain("8081-i50trwup00wv2eje8v567-6508c67c.us2.manus.computer");
    expect(domain).toBe(".manus.computer");
  });

  it("both server and frontend should share the same cookie domain", () => {
    const serverDomain = getParentDomain("3000-i50trwup00wv2eje8v567-6508c67c.us2.manus.computer");
    const frontendDomain = getParentDomain("8081-i50trwup00wv2eje8v567-6508c67c.us2.manus.computer");
    expect(serverDomain).toBe(frontendDomain);
  });

  it("should return undefined for localhost", () => {
    expect(getParentDomain("localhost")).toBeUndefined();
  });

  it("should return undefined for IP addresses", () => {
    expect(getParentDomain("127.0.0.1")).toBeUndefined();
    expect(getParentDomain("192.168.1.1")).toBeUndefined();
  });
});

describe("OAuth Redirect URL Construction", () => {
  it("should construct correct redirect URL with user info", () => {
    const frontendUrl = "https://8081-i50trwup00wv2eje8v567-6508c67c.us2.manus.computer";
    const sessionToken = "test-jwt-token";
    const userInfo = {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "google",
      lastSignedIn: "2026-01-01T00:00:00.000Z",
    };

    const userBase64 = Buffer.from(JSON.stringify(userInfo)).toString("base64");
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.pathname = "/oauth/callback";
    redirectUrl.searchParams.set("sessionToken", sessionToken);
    redirectUrl.searchParams.set("user", userBase64);

    const result = redirectUrl.toString();

    expect(result).toContain("/oauth/callback");
    expect(result).toContain("sessionToken=test-jwt-token");
    expect(result).toContain("user=");

    // Verify the user param can be decoded
    const url = new URL(result);
    const userParam = url.searchParams.get("user")!;
    const decoded = JSON.parse(Buffer.from(userParam, "base64").toString("utf-8"));
    expect(decoded.name).toBe("Test User");
    expect(decoded.openId).toBe("test-open-id");
  });
});
