const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRides() {
    const { count, error } = await supabase.from('rides').select('*', { count: 'exact', head: true });
    
    if (error) console.error("Error checking DB:", error.message);
    else console.log(`Total Rides in DB: ${count}`);
    
    if (count > 0) {
        const { data } = await supabase.from('rides').select('id, status, created_at').limit(5);
        console.log("Recent Rides:", data);
    }
}

checkRides();
