

## Enable Auto-Confirm for Email Signups

**What this does:** New users will be able to sign in immediately after signing up, without needing to click an email confirmation link.

### Technical Details

1. **Configure authentication settings** to enable auto-confirm for email signups using the auth configuration tool.

2. **Update the signup success message** in `src/pages/Auth.tsx` -- instead of showing "Check your email, we sent you a confirmation link", automatically navigate to the dashboard after successful signup (same behavior as login).

