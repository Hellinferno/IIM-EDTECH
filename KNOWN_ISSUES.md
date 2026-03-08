# Known Issues (Prototype v0.1)

1. Supabase retention is dashboard-configured
- Temporary image TTL is expected at bucket policy/config level and must be set in Supabase.

2. Real API keys required for runtime auth/AI
- The app builds without keys, but runtime auth and AI routes need valid Clerk/Gemini/Supabase credentials.

3. Prompt behavior not yet benchmarked
- Guided-mode "no direct answer" compliance still requires the planned test matrix in `TASKS.md`.

4. Security audit warnings
- `npm install` reports 4 high severity vulnerabilities in transitive dependencies.
- Requires dependency upgrade or `npm audit fix` strategy before production launch.
