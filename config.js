// Fill these in from Supabase → Project Settings → API
// This key is safe to expose publicly — Row Level Security (in schema.sql)
// is what actually protects the data, not this key being secret.
const SUPABASE_URL = "https://vxxmigdzimnrbbmkjzoa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F";

// Razorpay Key ID (Company Owner se account banwa kar yahan replace karein)
// Example: "rzp_live_xxxxxxxxxxxx" ya test ke liye "rzp_test_xxxxxxxxxxxx"
const RAZORPAY_KEY_ID = "rzp_test_placeholder_key";

if (typeof window !== 'undefined') {
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.RAZORPAY_KEY_ID = RAZORPAY_KEY_ID;
}
