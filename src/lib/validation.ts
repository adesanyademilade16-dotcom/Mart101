import { z } from "zod";

// Normalize the same way Signup.tsx does before it ever reaches Supabase:
// strip ALL whitespace (not just leading/trailing — mobile autocorrect
// often inserts a stray space right before the TLD, e.g. "name@gmail. com")
// and lowercase (mobile keyboards commonly auto-capitalize the first
// letter of a text field). Without matching normalization here, a user
// can type the exact same email at signup and login and still get
// "invalid credentials" purely from casing/whitespace differences.
export const normalizeEmail = (v: string) => v.replace(/\s+/g, "").toLowerCase();

export const loginSchema = z.object({
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.string().min(1, "Email is required").email("Please enter a valid email address.")),
  password: z.string().min(1, "Password is required"),
});
