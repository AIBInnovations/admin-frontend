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
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AuthCard } from "./AuthCard";

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

  const problem = error && (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{error}</span>
    </p>
  );
  const emailError = emailForm.formState.errors.email?.message;
  const newError = passwordForm.formState.errors.new_password?.message;
  const confirmError = passwordForm.formState.errors.confirm_password?.message;

  return (
    <AuthCard
      title={step === "success" ? "Password Reset" : "Forgot Password"}
      description={
        step === "email" ? "Enter your admin email to receive an OTP on your registered phone"
          : step === "otp" ? `Sending OTP to ${maskedPhone}…`
            : step === "new_password" ? "OTP verified. Set your new password."
              : "Your password has been reset successfully."
      }
    >
      {/* Email Step */}
      {step === "email" && (
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-5">
          {problem}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@pgme.com"
              autoComplete="email"
              autoFocus
              disabled={emailForm.formState.isSubmitting}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              className="h-10"
              {...emailForm.register("email")}
            />
            {emailError && <p id="email-error" role="alert" className="text-xs text-danger">{emailError}</p>}
          </div>
          <Button type="submit" className="h-10 w-full" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            {emailForm.formState.isSubmitting ? "Sending OTP…" : "Send OTP"}
          </Button>
          <div className="text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </form>
      )}

      {/* OTP Widget Loading Step */}
      {step === "otp" && (
        <div role="status" className="flex flex-col items-center gap-4 py-6">
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center text-sm text-muted-foreground">
            Opening OTP verification for <span className="font-medium text-foreground">{maskedPhone}</span>
          </p>
        </div>
      )}

      {/* New Password Step */}
      {step === "new_password" && (
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate className="space-y-5">
          {problem}
          <div className="space-y-1.5">
            <Label htmlFor="new_password" className="text-[13px] font-medium">New Password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="Enter new password"
              autoComplete="new-password"
              autoFocus
              disabled={passwordForm.formState.isSubmitting}
              aria-invalid={newError ? true : undefined}
              aria-describedby={newError ? "new-error" : "new-hint"}
              className="h-10"
              {...passwordForm.register("new_password")}
            />
            {newError ? <p id="new-error" role="alert" className="text-xs text-danger">{newError}</p> : <p id="new-hint" className="text-xs text-muted-foreground">At least 8 characters</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password" className="text-[13px] font-medium">Confirm Password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={passwordForm.formState.isSubmitting}
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? "confirm-error" : undefined}
              className="h-10"
              {...passwordForm.register("confirm_password")}
            />
            {confirmError && <p id="confirm-error" role="alert" className="text-xs text-danger">{confirmError}</p>}
          </div>
          <Button type="submit" className="h-10 w-full" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            {passwordForm.formState.isSubmitting ? "Resetting password…" : "Reset Password"}
          </Button>
        </form>
      )}

      {/* Success Step */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-4 py-2">
          <CheckCircle2 aria-hidden="true" className="h-12 w-12 text-success" />
          <p className="text-center text-sm text-muted-foreground">You can now sign in with your new password.</p>
          <Button className="h-10 w-full" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      )}
    </AuthCard>
  );
}
