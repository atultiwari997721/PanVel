const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clearRides() {
    console.log("Clearing Rides...");
    const { error } = await supabase.from('rides').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) console.error("Error clearing rides:", error.message);
    else console.log("All rides cleared. Dashboard should be empty.");
}

clearRides();
