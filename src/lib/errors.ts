// Turns raw Supabase/Postgres errors into safe, user-facing messages —
// never leaks internal error codes or DB details to the UI.
export function sanitizeError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    if (msg.toLowerCase().includes("invalid login credentials")) {
      return "Incorrect email or password.";
    }
    if (msg.toLowerCase().includes("email not confirmed")) {
      return "Please confirm your email before logging in.";
    }
    if (msg.length < 150) return msg;
  }
  return "Something went wrong. Please try again.";
}

type SignupFieldError = { field: "email" | "password" | "form"; message: string };

export function mapSignupError(error: unknown): SignupFieldError {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";

  const lower = msg.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("only request this after")) {
    return { field: "form", message: "Too many attempts. Please wait a few minutes and try again." };
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return { field: "email", message: "An account with this email already exists." };
  }
  if (lower.includes("password")) {
    return { field: "password", message: "Password does not meet requirements." };
  }
  if (lower.includes("email")) {
    return { field: "email", message: "Please enter a valid email address." };
  }
  return { field: "form", message: "Something went wrong. Please try again." };
}
