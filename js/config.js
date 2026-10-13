window.BC = window.BC || {};
// Public (anon) credentials for the shared-world backend. Safe to ship: all access is PIN-checked server side.
BC.CONFIG = {
  supabaseUrl: 'https://zkefxhjslolsxjquynmx.supabase.co',
  // The legacy anon key (a JWT) is used because every Realtime client version accepts it for the live channel.
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZWZ4aGpzbG9sc3hqcXV5bm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzY0OTIsImV4cCI6MjA5NjQ1MjQ5Mn0.m6f7LSV8oSTWW7FTgGM9Q1wlngzdgcjqU9uhs8tE7bA',
};
