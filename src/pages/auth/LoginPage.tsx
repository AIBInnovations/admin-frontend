import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { openOTPWidget } from "@/lib/msg91";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthCard } from "./AuthCard";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember_me: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, verifyOTP, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember_me: false,
    },
  });

  const rememberMe = watch("remember_me");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const otpState = await login({
        email: data.email,
        password: data.password,
      });

      if (otpState) {
        // OTP required — open MSG91 widget with admin's phone pre-filled
        try {
          const msg91AccessToken = await openOTPWidget(otpState.identifier);

          // Widget OTP verified — send access token to backend
          await verifyOTP({
            admin_id: otpState.admin_id,
            access_token: msg91AccessToken,
          });
          // Navigation handled by context
        } catch (widgetErr) {
          const msg =
            widgetErr instanceof Error
              ? widgetErr.message
              : "OTP verification failed";
          setError(msg);
        }
      }
      // If null, direct login happened — navigation handled by context
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthCard title="PGME Admin" description="Sign in to your admin account" footer="Admin access only">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Error Alert */}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        )}

        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@pgme.com"
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-10"
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-xs text-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] font-medium">Password</Label>
            <Link to="/forgot-password" className="text-[13px] text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isSubmitting}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="text-xs text-danger">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember_me"
            checked={rememberMe}
            onCheckedChange={(checked) => setValue("remember_me", checked as boolean)}
            disabled={isSubmitting}
          />
          <Label htmlFor="remember_me" className="cursor-pointer text-sm font-normal">Remember me</Label>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
