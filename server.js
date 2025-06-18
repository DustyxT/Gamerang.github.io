const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Production Supabase configuration
const supabaseUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbHp6dW9wbHhyZnRycWJoYmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTcwNjgsImV4cCI6MjA2Mzg5MzA2OH0.1U-dUVRY3qDPYsHEa0EttgKWpCRnlX3BS5SPE2qBExA';

const app = express();

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Using production Supabase:', supabaseUrl);

// Debug middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3006',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Routes
// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Submit game route - now accepts JSON data with Supabase storage URLs
app.post('/api/submit-game', async (req, res) => {
    try {
        console.log('Received game submission request');
        console.log('Body:', req.body);

        const gameData = req.body;
        
        // Insert game into Supabase
        const { data, error } = await supabase
            .from('games')
            .insert([gameData])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Game submitted successfully:', data);
        res.status(201).json({ 
            success: true, 
            message: 'Game submitted successfully',
            game: data[0]
        });
    } catch (error) {
        console.error('Error submitting game:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting game',
            error: error.message 
        });
    }
});

// Get all games
app.get('/api/games', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('*');

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single game
app.get('/api/games/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('games')
            .select(`
                *,
                reviews (*),
                game_category_relations (
                    game_categories (*)
                )
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ message: 'Game not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching game:', error);
        res.status(500).json({ message: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

// Handle other routes
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, page);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error serving ${page}:`, err);
            res.status(404).send('File not found');
        }
    });
});

const PORT = 3006;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Root directory: ${__dirname}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
}); 