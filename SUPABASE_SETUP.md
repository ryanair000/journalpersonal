# Supabase Auth and encrypted cloud sync

The frontend is ready for a dedicated Supabase project. Project creation is currently blocked because the connected free organization already has two active projects.

## Security model

- Supabase Auth stores and verifies account passwords.
- The browser derives an AES-256-GCM key from a separate encryption passphrase using PBKDF2-SHA-256 with 310,000 iterations.
- The dashboard state is encrypted before upload.
- The encryption passphrase is held only in page memory and is never sent to Supabase or saved in local/session storage.
- `encrypted_user_state` uses RLS so each authenticated user can access only their own ciphertext row.
- The publishable browser key is safe to expose only because RLS is enabled. Never place a secret/service-role key in frontend files.

## Complete backend setup

1. Free one Supabase project slot or upgrade the organization.
2. Create a dedicated project named `journalpersonal`.
3. Run `supabase/schema.sql` in its SQL editor.
4. Run Supabase Security Advisor and fix all findings.
5. Copy the project URL and active publishable key into `supabase-config.js`.
6. In Auth URL Configuration, set:
   - Site URL: `https://journalpersonal.vercel.app`
   - Redirect URL: `https://journalpersonal.vercel.app/**`
7. Keep email confirmation enabled. Configure custom SMTP before broad production use; the default sender is rate-limited.
8. Deploy and test sign-up, confirmation, sign-in, reset, upload, download, wrong-passphrase rejection, and cross-user isolation.

## Passphrase warning

Cloud ciphertext cannot be recovered without the encryption passphrase. Account-password reset does not reset the encryption passphrase.
