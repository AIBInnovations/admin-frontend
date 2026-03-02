import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, OTPState } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember_me: z.boolean().optional(),
});

const otpSchema = z.object({
  otp_code: z
    .string()
    .length(4, "OTP must be 4 digits")
    .regex(/^[0-9]{4}$/, "OTP must contain only digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [otpState, setOtpState] = useState<OTPState | null>(null);
  const { login, verifyOTP, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const otpInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    setValue: setLoginValue,
    watch: watchLogin,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember_me: false,
    },
  });

  const {
    register: registerOTP,
    handleSubmit: handleOTPSubmit,
    formState: { errors: otpErrors, isSubmitting: isOTPSubmitting },
    reset: resetOTP,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp_code: "",
    },
  });

  const rememberMe = watchLogin("remember_me");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Focus OTP input when OTP step appears
  useEffect(() => {
    if (otpState) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [otpState]);

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const result = await login({
        email: data.email,
        password: data.password,
      });

      if (result) {
        // OTP required
        setOtpState(result);
      }
      // If null, direct login happened — navigation handled by context
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
    }
  };

  const onOTPSubmit = async (data: OTPFormData) => {
    if (!otpState) return;

    try {
      setError(null);
      await verifyOTP({
        admin_id: otpState.admin_id,
        otp_code: data.otp_code,
      });
      // Navigation handled by context
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "OTP verification failed. Please try again.";
      setError(errorMessage);
    }
  };

  const handleBackToLogin = () => {
    setOtpState(null);
    setError(null);
    resetOTP();
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            PGME Admin
          </CardTitle>
          <CardDescription className="text-center">
            {otpState
              ? `Enter the OTP sent to ${otpState.phone}`
              : "Sign in to your admin account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!otpState ? (
            /* ===== Step 1: Email + Password ===== */
            <form
              onSubmit={handleLoginSubmit(onLoginSubmit)}
              className="space-y-4"
            >
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@pgme.com"
                  autoComplete="email"
                  disabled={isLoginSubmitting}
                  {...registerLogin("email")}
                />
                {loginErrors.email && (
                  <p className="text-sm text-red-500">
                    {loginErrors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoginSubmitting}
                  {...registerLogin("password")}
                />
                {loginErrors.password && (
                  <p className="text-sm text-red-500">
                    {loginErrors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember_me"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setLoginValue("remember_me", checked as boolean)
                  }
                  disabled={isLoginSubmitting}
                />
                <Label
                  htmlFor="remember_me"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoginSubmitting}
              >
                {isLoginSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          ) : (
            /* ===== Step 2: OTP Verification ===== */
            <form
              onSubmit={handleOTPSubmit(onOTPSubmit)}
              className="space-y-4"
            >
              {/* OTP Field */}
              <div className="space-y-2">
                <Label htmlFor="otp_code">OTP Code</Label>
                <Input
                  id="otp_code"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 4-digit OTP"
                  maxLength={4}
                  autoComplete="one-time-code"
                  disabled={isOTPSubmitting}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  {...registerOTP("otp_code")}
                  ref={(e) => {
                    registerOTP("otp_code").ref(e);
                    (otpInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                  }}
                />
                {otpErrors.otp_code && (
                  <p className="text-sm text-red-500">
                    {otpErrors.otp_code.message}
                  </p>
                )}
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isOTPSubmitting}
              >
                {isOTPSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              {/* Back to Login */}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBackToLogin}
                disabled={isOTPSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </form>
          )}

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Admin access only</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
