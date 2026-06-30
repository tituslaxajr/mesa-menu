"use server";
// Owner authentication via Supabase Auth. Server Actions run on the server, so
// credentials never touch client JS. On signup, the DB trigger (handle_new_user)
// provisions the account + owner membership; the café is created in onboarding.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export interface AuthState {
  error?: string;
}

export async function login(_prev: AuthState | undefined, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(_prev: AuthState | undefined, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const cafeName = String(formData.get("cafe_name") ?? "").trim();
  const planRaw = String(formData.get("plan") ?? "");
  const plan = ["starter", "brew", "roast"].includes(planRaw) ? planRaw : undefined;
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { cafe_name: cafeName, ...(plan ? { plan } : {}) } },
  });
  if (error) return { error: error.message };

  // If email confirmation is enabled, there's no session yet — send them to log
  // in after confirming. Otherwise they're signed in and go straight to setup.
  if (!data.session) redirect("/login?check-email=1");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordReset(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  // Sends a recovery link to /auth/callback, which establishes a session and
  // forwards to /reset-password. Never reveals whether the email exists.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Your reset link has expired. Request a new one from “Forgot password”." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
