import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Waitlist Console" },
      { name: "description", content: "Admin sign in for the Waitlist Console CRM." },
      { property: "og:title", content: "Sign in — Waitlist Console" },
      { property: "og:description", content: "Admin sign in for the Waitlist Console CRM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/" });
  };

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. You can sign in now.");
    void navigate({ to: "/" });
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md panel p-8">
        <p className="label-caps">Waitlist Console</p>
        <h1 className="mt-2 text-2xl font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage the waitlist. The first account created becomes the admin.
        </p>

        <Button variant="secondary" className="mt-6 w-full" onClick={() => void signInWithGoogle()}>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-caps">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          {(["signin", "signup"] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <form
                className="grid gap-4 pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (tab === "signin" ? signIn() : signUp());
                }}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor={`${tab}-email`}>Email</Label>
                  <Input
                    id={`${tab}-email`}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${tab}-password`}>Password</Label>
                  <Input
                    id={`${tab}-password`}
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          ))}
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Back to console
          </Link>
        </p>
      </div>
    </main>
  );
}
