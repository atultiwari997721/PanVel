const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Middleware
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
    origin: function (origin, callback) {
        // Allow mobile apps, local dev, specific client URL, and Vercel deployments
        if (!origin || origin === clientUrl || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 1. Socket Logic
require('./socketHandler')(io, supabase);

// 2. API Routes
const apiRouter = express.Router();

// --- AUTH HELPER ---
const getSession = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
};

// --- USER AUTH ---

// User Signup
apiRouter.post('/auth/user/signup', async (req, res) => {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ error: 'Mobile and password required' });
    
    const email = `u${mobile}@panvel.app`; // Format: u9876543210@panvel.app

    try {
        console.log(`Creating user: ${mobile}`);
        // 1. Create User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'user' }
        });

        if (authError) {
             // Handle Exists
             if (authError.message.includes('already registered')) {
                 return res.status(400).json({ error: 'User already exists. Please login.' });
             }
             throw authError;
        }

        // 2. Create Profile
        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            mobile: mobile,
            email: email,
            full_name: 'User ' + mobile,
            user_type: 'user',
            is_online: true
        });

        if (profileError) throw profileError;

        // 3. Login immediately to return session
        const sessionData = await getSession(email, password);
        res.json({ success: true, session: sessionData.session, user: sessionData.user });

    } catch (error) {
        console.error("User Signup Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// User Login
apiRouter.post('/auth/user/login', async (req, res) => {
    const { mobile, password } = req.body;
    const email = `u${mobile}@panvel.app`;

    try {
        const sessionData = await getSession(email, password);
        
        // Check Role
        const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', sessionData.user.id).single();
        if (profile && profile.user_type !== 'user') {
             return res.status(403).json({ error: 'Not a user account' });
        }

        res.json({ success: true, session: sessionData.session, user: sessionData.user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid login credentials' });
    }
});

// --- PARTNER AUTH ---

// Validates 12-digit ID format
function isValidPartnerID(id) {
    return /^\d{12}$/.test(id);
}

// Partner Login
apiRouter.post('/auth/partner/login', async (req, res) => {
    const { partnerId, password } = req.body;
    
    // We use the partnerID to find the email or construct it if we enforce a pattern
    // Strategy: Email is p<partnerId>@panvel.app
    const email = `p${partnerId}@panvel.app`;

    try {
        const sessionData = await getSession(email, password);

        // Check Role
        const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', sessionData.user.id).single();
         if (profile && profile.user_type !== 'partner') {
             return res.status(403).json({ error: 'Not a partner account' });
        }

        res.json({ success: true, session: sessionData.session, user: sessionData.user });
    } catch (error) {
        console.error("Partner Login Error", error);
        res.status(401).json({ error: 'Invalid Partner ID or Password' });
    }
});

// Admin: Create Partner (Generates ID)
apiRouter.post('/admin/create-partner', async (req, res) => {
    const { mobile, password, fullName, vehicleDetails } = req.body;
    
    // Generate 12-digit ID
    const partnerId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const email = `p${partnerId}@panvel.app`;

    try {
        console.log(`Creating partner with ID: ${partnerId}`);
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: 'partner' }
        });

        if (authError) throw authError;

        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            mobile: mobile,
            email: email,
            full_name: fullName,
            user_type: 'partner',
            vehicle_details: vehicleDetails,
            is_online: false,
            partner_unique_id: partnerId
        });

        if (profileError) throw profileError;

        res.json({ success: true, partnerId, message: 'Partner created successfully' });
    } catch (error) {
        console.error("Create Partner Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Get Dashboard Data (Bypasses RLS)
apiRouter.get('/admin/dashboard', async (req, res) => {
    try {
        const { data: rides, error: ridesError } = await supabase
            .from('rides')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (ridesError) throw ridesError;

        const { data: drivers, error: driversError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_type', 'partner');

        if (driversError) throw driversError;

        res.json({ rides, drivers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PARTNER: Get Pending Rides
apiRouter.get('/rides/pending', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('rides')
            .select('*')
            .eq('status', 'requested');
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Geocoding Proxy (Bypasses CORS)
apiRouter.get('/geocode', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Lat/Lng required' });

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        // Fetch using generic fetch if available (Node 18+)
        // Or assume fetch is global. If not, we might need axios or http.
        // Node 18+ has native fetch.
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'PanVel-App/1.0 (contact@panvel.app)'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Geocoding Error:", error);
        res.status(500).json({ error: 'Failed to fetch address' });
    }
});

// Mount API Router
app.use('/api', apiRouter);

// Health Check
app.get('/', (req, res) => {
    res.send('PanVel Backend Running');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
