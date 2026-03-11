import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import validator from 'validator';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// --- WEBSOCKETS ---
io.on('connection', (socket) => {
    socket.on('join-picnic', (picnicId) => {
        socket.join(picnicId);
        console.log(`Socket ${socket.id} joined room ${picnicId}`);
    });
});

// Helper to notify a picnic room
const notifyPicnicUpdated = (picnicId) => {
    io.to(picnicId).emit('picnic-updated', { picnicId });
};

// --- API ROUTES ---

// Create a new picnic
app.post('/api/picnics', async (req, res) => {
    const { name, lat, lon, organizerName, avatar, dateText, timeText } = req.body;

    if (!name || !lat || !lon || !organizerName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const picnicId = uuidv4();
    const safeName = validator.escape(name);
    const safeOrganizerName = validator.escape(organizerName);
    const pAvatar = avatar ? validator.escape(avatar) : '👑';
    const safeDateText = dateText ? validator.escape(dateText) : null;
    const safeTimeText = timeText ? validator.escape(timeText) : null;

    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Insert picnic
            await connection.query(
                'INSERT INTO picnics (id, name, lat, lon) VALUES (?, ?, ?, ?)',
                [picnicId, safeName, lat, lon]
            );

            // Insert organizer
            const [participantResult] = await connection.query(
                `INSERT INTO participants (picnic_id, name, role, avatar) VALUES (?, ?, 'organizer', ?)`,
                [picnicId, safeOrganizerName, pAvatar]
            );

            // Insert first date if provided
            if (safeDateText && safeTimeText) {
                await connection.query(
                    `INSERT INTO picnic_dates (picnic_id, date_text, time_text, added_by) VALUES (?, ?, ?, ?)`,
                    [picnicId, safeDateText, safeTimeText, participantResult.insertId]
                );
            }

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

        // Get proposed dates and votes
        const [dates] = await pool.query('SELECT * FROM picnic_dates WHERE picnic_id = ?', [picnicId]);
        
        let datesWithVotes = [];
        if (dates.length > 0) {
            const dateIds = dates.map(d => d.id);
            const [votes] = await pool.query(`
                SELECT v.date_id, v.participant_id, u.name as participant_name
                FROM picnic_date_votes v
                JOIN participants u ON v.participant_id = u.id
                WHERE v.date_id IN (?)
            `, [dateIds]);
            
            datesWithVotes = dates.map(date => {
                return {
                    id: date.id,
                    dateText: date.date_text,
                    timeText: date.time_text,
                    addedBy: date.added_by,
                    votes: votes.filter(v => v.date_id === date.id).map(v => ({
                        participantId: v.participant_id,
                        participantName: v.participant_name
                    }))
                };
            });
        }

        res.json({
            ...picnic,
            participants,
            dates: datesWithVotes,
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
        const safeName = validator.escape(name);
        const pAvatar = avatar ? validator.escape(avatar) : '👤';
        const [result] = await pool.query(
            `INSERT INTO participants (picnic_id, name, role, avatar) VALUES (?, ?, 'guest', ?)`,
            [picnicId, safeName, pAvatar]
        );
        notifyPicnicUpdated(picnicId);
        res.status(201).json({ id: result.insertId, name: safeName, role: 'guest', avatar: pAvatar });
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
        const safeName = validator.escape(name);
        const safeAddedBy = addedBy ? validator.escape(String(addedBy)) : 'Anonymous';
        const [result] = await pool.query(
            `INSERT INTO potluck_items (picnic_id, name, status, added_by) VALUES (?, ?, 'needed', ?)`,
            [picnicId, safeName, safeAddedBy]
        );
        notifyPicnicUpdated(picnicId);
        res.status(201).json({ id: result.insertId, name: safeName, status: 'needed', addedBy: safeAddedBy, claimedBy: null });
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
        notifyPicnicUpdated(picnicId);
        res.json({ message: 'Item claimed successfully' });
    } catch (error) {
        console.error('Error claiming item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a proposed date
app.post('/api/picnics/:id/dates', async (req, res) => {
    const picnicId = req.params.id;
    const { dateText, timeText, participantId } = req.body;

    if (!dateText || !timeText || !participantId) return res.status(400).json({ error: 'Missing required fields' });

    try {
        const safeDateText = validator.escape(dateText);
        const safeTimeText = validator.escape(timeText);
        const [result] = await pool.query(
            `INSERT INTO picnic_dates (picnic_id, date_text, time_text, added_by) VALUES (?, ?, ?, ?)`,
            [picnicId, safeDateText, safeTimeText, participantId]
        );
        notifyPicnicUpdated(picnicId);
        res.status(201).json({ id: result.insertId, dateText: safeDateText, timeText: safeTimeText, addedBy: participantId });
    } catch (error) {
        console.error('Error adding date:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle vote on a date
app.put('/api/picnics/:id/dates/:dateId/vote', async (req, res) => {
    const { dateId } = req.params;
    const { participantId } = req.body;

    if (!participantId) return res.status(400).json({ error: 'Participant ID is required' });

    try {
        // Check if vote exists
        const [existing] = await pool.query(
            'SELECT * FROM picnic_date_votes WHERE date_id = ? AND participant_id = ?',
            [dateId, participantId]
        );

        if (existing.length > 0) {
            // Remove vote
            await pool.query('DELETE FROM picnic_date_votes WHERE id = ?', [existing[0].id]);
            res.json({ message: 'Vote removed', action: 'removed' });
        } else {
            // Add vote
            await pool.query(
                'INSERT INTO picnic_date_votes (date_id, participant_id) VALUES (?, ?)',
                [dateId, participantId]
            );
            notifyPicnicUpdated(req.params.id);
            res.json({ message: 'Vote added', action: 'added' });
        }
    } catch (error) {
        console.error('Error toggling vote:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
