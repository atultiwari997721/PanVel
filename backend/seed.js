const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log("Seeding Database...");

    const partnerId = "111122223333";
    const partnerEmail = `p${partnerId}@panvel.app`;
    const riderEmail = 'testrider@panvel.app';
    const password = 'password123';

    // 1. Create Partner Auth & Profile
    const { data: pAuth, error: pAuthError } = await supabase.auth.admin.createUser({
        email: partnerEmail,
        password: password,
        email_confirm: true,
        user_metadata: { role: 'partner' }
    });
    
    // Ignore "already registered" error, just get the ID
    let pUserId = pAuth?.user?.id;
    if (!pUserId) {
        // Try fetch existing? Or just rely on upsert failing if mapped correctly?
        // Actually, for simplicity, let's just delete them first to be clean? No, too risky.
        // Let's assume users exist or just skip.
        console.log("Partner Auth User might already exist or failed:", pAuthError?.message);
        // We can't easily get ID of existing user without listUsers which is heavyweight.
        // Let's just create NEW random emails :) 
    }

    // REWRITE: Just CREATE NEW RANDOM DATA ALWAYS to avoid conflicts
    const randomSuffix = Math.floor(Math.random() * 10000);
    const newPartnerEmail = `p${partnerId}${randomSuffix}@panvel.app`;
    const newRiderEmail = `rider${randomSuffix}@panvel.app`;
    
    // 1. Create Partner
    const { data: pData } = await supabase.auth.admin.createUser({
        email: newPartnerEmail, password: 'password123', email_confirm: true
    });
    const pId = pData.user.id;
    
    await supabase.from('profiles').insert({
        id: pId,
        mobile: `99${randomSuffix}`,
        email: newPartnerEmail,
        full_name: 'Test Partner ' + randomSuffix,
        user_type: 'partner',
        partner_unique_id: partnerId + randomSuffix,
        is_online: true
    });
    console.log("Partner Created:", pId);

    // 2. Create Rider
    const { data: rData } = await supabase.auth.admin.createUser({
        email: newRiderEmail, password: 'password123', email_confirm: true
    });
    const rId = rData.user.id;

    await supabase.from('profiles').insert({
        id: rId,
        mobile: `88${randomSuffix}`,
        email: newRiderEmail,
        full_name: 'Test Rider ' + randomSuffix,
        user_type: 'user',
        is_online: true
    });
    console.log("Rider Created:", rId);

    // 3. Create Ride
    const { data: ride } = await supabase.from('rides').insert({
        rider_id: rId,
        pickup_lat: 19.0330,
        pickup_lng: 73.0297,
        drop_lat: 18.9894,
        drop_lng: 73.1175,
        pickup_address: 'Test Pickup: Panvel Station',
        drop_address: 'Test Drop: Khanda Colony',
        fare: 150,
        distance_km: 5.5,
        status: 'requested',
        created_at: new Date().toISOString()
    }).select();
    
    console.log("Test Ride Created:", ride[0].id);
    console.log("Seeding Complete.");
}


seed();
