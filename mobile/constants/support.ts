/**
 * Help & privacy links (Figma 1013:1911). Rows whose link is empty are
 * hidden, so nothing points nowhere. Fill these in before release.
 */
export const SUPPORT = {
    /** International format without "+", e.g. "233201234567". Opens WhatsApp. */
    whatsappNumber: '',
    /** Public terms page, linked from Sign up. */
    termsUrl: '',
    /** Public privacy policy page. */
    privacyPolicyUrl: '',
    /** Optional page explaining how LogIt reads alerts; the in-app explanation is used when empty. */
    howItWorksUrl: '',
} as const;
