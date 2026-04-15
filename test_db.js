import pool from './db.js';

async function test() {
    try {
        const [rows] = await pool.query('SELECT 1');
        console.log('DB Connection successful');
    } catch (e) {
        console.error('DB Connection error:', e);
    } finally {
        process.exit();
    }
}
test();
