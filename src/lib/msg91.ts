const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID;
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH;

declare global {
  interface Window {
    initSendOTP?: (config: any) => void;
  }
}

/**
 * Opens the MSG91 OTP popup widget.
 * MSG91 handles the entire OTP flow (send, verify) in its popup.
 * Returns a promise that resolves with the MSG91 access token on success.
 *
 * @param identifier - Phone number with country code (e.g. "919876543210") to pre-fill
 * @returns MSG91 access token
 */
export function openOTPWidget(identifier?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window.initSendOTP !== 'function') {
      reject(new Error('OTP service is loading. Please try again.'));
      return;
    }

    const configuration: any = {
      widgetId: WIDGET_ID,
      tokenAuth: TOKEN_AUTH,
      success: (data: any) => {
        resolve(data.message); // MSG91 access token
      },
      failure: (error: any) => {
        reject(new Error(error?.message || 'OTP verification failed'));
      },
    };

    if (identifier) {
      configuration.identifier = identifier;
    }

    window.initSendOTP(configuration);
  });
}
