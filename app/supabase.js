import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase project URL (kept in source)
const SUPABASE_URL = 'https://pbzrtpuuenldgmqxxqae.supabase.co';

// Read anon key from Expo config 'extra' (injected via app.config.js or EAS/CI).
// Fallback to process.env for Node-based workflows, but process.env is not
// available inside the bundled RN app unless injected at build time.
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBienJ0cHV1ZW5sZGdtcXh4cWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0OTE1MDEsImV4cCI6MjA3NDA2NzUwMX0.Fg-Z-XZpJED5MimRy2QkA_N08TMLdymllUjlgNrb0vA" || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Notes:
// - For local dev set the env before starting Expo, e.g. (PowerShell):
//     $env:SUPABASE_KEY = "your-anon-key"; npx expo start
// - Or create app.config.js to forward process.env to expo.extra.SUPABASE_ANON_KEY.
// - Do NOT store service_role keys here. Only expose the anon/public key to clients.
