import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Email/Password Authentication Endpoints", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("should signup with email and password", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn(async () => ({
        success: true,
        sessionToken: "token-123",
        user: {
          id: "user-123",
          openId: "user-123",
          name: "John Doe",
          email: "john@example.com",
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/email-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "john@example.com",
        password: "password123",
        name: "John Doe",
      }),
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/email-signup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.sessionToken).toBe("token-123");
    expect(data.user.email).toBe("john@example.com");
    expect(data.user.loginMethod).toBe("email");
  });

  it("should login with email and password", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn(async () => ({
        success: true,
        sessionToken: "token-456",
        user: {
          id: "user-456",
          openId: "user-456",
          name: "Jane Smith",
          email: "jane@example.com",
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/email-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "jane@example.com",
        password: "password456",
      }),
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/email-login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.sessionToken).toBe("token-456");
    expect(data.user.email).toBe("jane@example.com");
  });

  it("should return error for invalid login credentials", async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn(async () => ({
        error: "Invalid email or password",
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/email-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      }),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.error).toBe("Invalid email or password");
  });

  it("should return error for duplicate email on signup", async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn(async () => ({
        error: "Email already registered",
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/email-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "existing@example.com",
        password: "password123",
        name: "Duplicate User",
      }),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.error).toBe("Email already registered");
  });

  it("should return error for missing required fields", async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn(async () => ({
        error: "Missing required fields",
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/email-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        // Missing password and name
      }),
    });

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.error).toBe("Missing required fields");
  });

  it("should handle email trimming and normalization", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn(async () => ({
        success: true,
        sessionToken: "token-789",
        user: {
          id: "user-789",
          openId: "user-789",
          name: "Test User",
          email: "test@example.com",
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/email-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "  test@example.com  ", // Extra whitespace
        password: "  password123  ", // Extra whitespace
      }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.user.email).toBe("test@example.com");
  });

  it("should return session token for authenticated requests", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn(async () => ({
        user: {
          id: "user-123",
          openId: "user-123",
          name: "John Doe",
          email: "john@example.com",
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      })),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-token-123",
      },
    });

    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
        }),
      })
    );
    expect(response.ok).toBe(true);
    expect(data.user).toBeDefined();
  });
});
