import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { openOTPWidget } from "@/lib/msg91";
import { authService } from "@/services/auth.service";
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
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

// Step 1: email form
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Step 2: new password form
const passwordSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = "email" | "otp" | "new_password" | "success";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string>("");

  // Persisted across steps
  const [adminId, setAdminId] = useState<string>("");
  const [otpAccessToken, setOtpAccessToken] = useState<string>("");

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  // Step 1: look up email, then open OTP widget
  const onEmailSubmit = async (data: EmailFormData) => {
    try {
      setError(null);
      const response = await authService.forgotPassword(data.email);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to initiate password reset");
      }

      const { admin_id, identifier, phone } = response.data;
      setAdminId(admin_id);
      setMaskedPhone(phone);

      // Open MSG91 OTP widget — same as login 2FA
      setStep("otp");
      try {
        const token = await openOTPWidget(identifier);
        setOtpAccessToken(token);
        setStep("new_password");
      } catch (widgetErr) {
        setStep("email");
        setError(
          widgetErr instanceof Error
            ? widgetErr.message
            : "OTP verification failed. Please try again."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  // Step 2: set new password
  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setError(null);
      const response = await authService.resetPassword({
        admin_id: adminId,
        access_token: otpAccessToken,
        new_password: data.new_password,
      });

      if (!response.success) {
        throw new Error(response.message || "Password reset failed");
      }

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed. Please try again.");
    }
  };

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
            {step === "success" ? "Password Reset" : "Forgot Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "email" && "Enter your admin email to receive an OTP on your registered phone"}
            {step === "otp" && `Sending OTP to ${maskedPhone}…`}
            {step === "new_password" && "OTP verified. Set your new password."}
            {step === "success" && "Your password has been reset successfully."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Email Step */}
          {step === "email" && (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@pgme.com"
                  autoComplete="email"
                  disabled={emailForm.formState.isSubmitting}
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP…
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </div>
            </form>
          )}

          {/* OTP Widget Loading Step */}
          {step === "otp" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                Opening OTP verification for <span className="font-medium">{maskedPhone}</span>
              </p>
            </div>
          )}

          {/* New Password Step */}
          {step === "new_password" && (
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={passwordForm.formState.isSubmitting}
                  {...passwordForm.register("new_password")}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={passwordForm.formState.isSubmitting}
                  {...passwordForm.register("confirm_password")}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-red-500">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting password…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm text-center text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
