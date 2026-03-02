import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static('.'));

// --- API ROUTES ---

// Create a new picnic
app.post('/api/picnics', async (req, res) => {
    const { name, lat, lon, organizerName, avatar } = req.body;

    if (!name || !lat || !lon || !organizerName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const picnicId = uuidv4();

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert picnic
            await connection.query(
                'INSERT INTO picnics (id, name, lat, lon) VALUES (?, ?, ?, ?)',
                [picnicId, name, lat, lon]
            );

            // Insert organizer
            const pAvatar = avatar || '👑';
            const [participantResult] = await connection.query(
                `INSERT INTO participants (picnic_id, name, role, avatar) VALUES (?, ?, 'organizer', ?)`,
                [picnicId, organizerName, pAvatar]
            );

            await connection.commit();
            res.status(201).json({
                id: picnicId,
                participantId: participantResult.insertId,
                message: 'Picnic created successfully'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating picnic:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get picnic details
app.get('/api/picnics/:id', async (req, res) => {
    const picnicId = req.params.id;

    try {
        // Get picnic record
        const [picnics] = await pool.query('SELECT * FROM picnics WHERE id = ?', [picnicId]);
        if (picnics.length === 0) {
            return res.status(404).json({ error: 'Picnic not found' });
        }

        const picnic = picnics[0];

        // Get participants
        const [participants] = await pool.query('SELECT * FROM participants WHERE picnic_id = ?', [picnicId]);

        // Get potluck items
        const [potluckItems] = await pool.query(`
            SELECT p.id, p.name, p.status, p.added_by, p.claimed_by,
                   u.name as claimer_name 
            FROM potluck_items p
            LEFT JOIN participants u ON p.claimed_by = u.id
            WHERE p.picnic_id = ?
        `, [picnicId]);

        res.json({
            ...picnic,
            participants,
            potluckItems: potluckItems.map(item => ({
                id: item.id,
                name: item.name,
                status: item.status,
                addedBy: item.added_by,
                claimedBy: item.claimed_by ? { id: item.claimed_by, name: item.claimer_name } : null
            }))
        });
    } catch (error) {
        console.error('Error fetching picnic:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Join a picnic
app.post('/api/picnics/:id/participants', async (req, res) => {
    const picnicId = req.params.id;
    const { name, avatar } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const pAvatar = avatar || '👤';
        const [result] = await pool.query(
            `INSERT INTO participants (picnic_id, name, role, avatar) VALUES (?, ?, 'guest', ?)`,
            [picnicId, name, pAvatar]
        );
        res.status(201).json({ id: result.insertId, name, role: 'guest', avatar: pAvatar });
    } catch (error) {
        console.error('Error joining picnic:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a potluck item
app.post('/api/picnics/:id/potluck', async (req, res) => {
    const picnicId = req.params.id;
    const { name, addedBy } = req.body; // addedBy is a string name or ID

    if (!name) return res.status(400).json({ error: 'Item name is required' });

    try {
        const [result] = await pool.query(
            `INSERT INTO potluck_items (picnic_id, name, status, added_by) VALUES (?, ?, 'needed', ?)`,
            [picnicId, name, addedBy || 'Anonymous']
        );
        res.status(201).json({ id: result.insertId, name, status: 'needed', addedBy: addedBy || 'Anonymous', claimedBy: null });
    } catch (error) {
        console.error('Error adding potluck item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Claim a potluck item
app.put('/api/picnics/:id/potluck/:itemId/claim', async (req, res) => {
    const { id: picnicId, itemId } = req.params;
    const { participantId } = req.body;

    if (!participantId) return res.status(400).json({ error: 'Participant ID is required' });

    try {
        await pool.query(
            `UPDATE potluck_items SET status = 'covered', claimed_by = ? WHERE id = ? AND picnic_id = ?`,
            [participantId, itemId, picnicId]
        );
        res.json({ message: 'Item claimed successfully' });
    } catch (error) {
        console.error('Error claiming item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
