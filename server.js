import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import validator from 'validator';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve static files from public directory using absolute path
app.use(express.static(path.join(__dirname, 'public')));

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

        // Get potluck items and their claims
        const [potluckItemsRows] = await pool.query(`
            SELECT id, name, quantity, status, added_by
            FROM potluck_items
            WHERE picnic_id = ?
        `, [picnicId]);

        const itemIds = potluckItemsRows.map(item => item.id);
        let claims = [];
        if (itemIds.length > 0) {
            const [claimRows] = await pool.query(`
                SELECT c.item_id, c.participant_id, c.quantity, u.name as participant_name
                FROM potluck_claims c
                JOIN participants u ON c.participant_id = u.id
                WHERE c.item_id IN (?)
            `, [itemIds]);
            claims = claimRows;
        }

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
            potluckItems: potluckItemsRows.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                status: item.status,
                addedBy: item.added_by,
                claims: claims.filter(c => c.item_id === item.id).map(c => ({
                    participantId: c.participant_id,
                    participantName: c.participant_name,
                    quantity: c.quantity
                }))
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
    const { name, addedBy, quantity } = req.body; // addedBy is a string name or ID

    if (!name) return res.status(400).json({ error: 'Item name is required' });

    try {
        const safeName = validator.escape(name);
        const safeAddedBy = addedBy ? validator.escape(String(addedBy)) : 'Anonymous';
        const itemQuantity = parseInt(quantity) || 1;
        const [result] = await pool.query(
            `INSERT INTO potluck_items (picnic_id, name, status, added_by, quantity) VALUES (?, ?, 'needed', ?, ?)`,
            [picnicId, safeName, safeAddedBy, itemQuantity]
        );
        notifyPicnicUpdated(picnicId);
        res.status(201).json({ id: result.insertId, name: safeName, status: 'needed', addedBy: safeAddedBy, quantity: itemQuantity, claims: [] });
    } catch (error) {
        console.error('Error adding potluck item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Claim a potluck item
app.post('/api/picnics/:id/potluck/:itemId/claim', async (req, res) => {
    const { id: picnicId, itemId } = req.params;
    const { participantId, quantity } = req.body;

    if (!participantId) return res.status(400).json({ error: 'Participant ID is required' });

    try {
        const claimQuantity = parseInt(quantity) || 1;
        
        await pool.query(
            `INSERT INTO potluck_claims (item_id, participant_id, quantity) VALUES (?, ?, ?)`,
            [itemId, participantId, claimQuantity]
        );

        const [itemTotalRows] = await pool.query(
            `SELECT quantity FROM potluck_items WHERE id = ? AND picnic_id = ?`,
            [itemId, picnicId]
        );
        
        if (itemTotalRows.length > 0) {
            const requiredQuantity = itemTotalRows[0].quantity;
            const [claimsTotalRows] = await pool.query(
                `SELECT SUM(quantity) as total_claimed FROM potluck_claims WHERE item_id = ?`,
                [itemId]
            );
            const totalClaimed = claimsTotalRows[0].total_claimed || 0;
            
            if (totalClaimed >= requiredQuantity) {
                await pool.query(`UPDATE potluck_items SET status = 'covered' WHERE id = ?`, [itemId]);
            }
        }

        notifyPicnicUpdated(picnicId);
        res.json({ message: 'Item claimed successfully' });
    } catch (error) {
        console.error('Error claiming item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a potluck item
app.delete('/api/picnics/:id/potluck/:itemId', async (req, res) => {
    const { id: picnicId, itemId } = req.params;

    try {
        await pool.query(
            `DELETE FROM potluck_items WHERE id = ? AND picnic_id = ?`,
            [itemId, picnicId]
        );
        notifyPicnicUpdated(picnicId);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
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
