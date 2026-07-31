import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ututplfwuwwkbcrrjydw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_P-DxPIQjWBTuCy3VhTwE2Q_OygxTVZV";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
