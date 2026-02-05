const dotenv = require('dotenv');
dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log("--- KEY DIAGNOSTICS ---");
console.log("URL Present:", !!url);
console.log("Service Key Present:", !!serviceKey);
if (serviceKey) {
    console.log("Service Key Length:", serviceKey.length);
    console.log("Service Key Start:", serviceKey.substring(0, 10) + "...");
} else {
    console.log("CRITICAL: SERVICE ROLE KEY IS MISSING!");
}

console.log("Anon Key Present:", !!anonKey);

if (serviceKey === anonKey) {
    console.log("CRITICAL: SERVICE KEY IS IDENTICAL TO ANON KEY! (This creates RLS issues)");
} else {
    console.log("Keys are distinct (Good).");
}

const { createClient } = require('@supabase/supabase-js');
async function testInsert() {
    if (!serviceKey) return;
    const supabase = createClient(url, serviceKey);
    console.log("Attempting Service Role Insert...");
    // Only works if RLS allows or Service Key works
    // We'll try to fetch a count, safest.
    const { count, error } = await supabase.from('rides').select('*', { count: 'exact', head: true });
    if (error) console.log("Service Role Query Failed:", error.message);
    else console.log("Service Role Query Success. Count:", count);
}

testInsert();
