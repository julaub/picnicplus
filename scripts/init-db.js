// scripts/init-db.js
// Initializes the database by running schema.sql against the configured MySQL server.
// Usage: npm run init-db

import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, '..', 'schema.sql');

async function initDatabase() {
    console.log('🗄️  Picnic App — Database Initialization');
    console.log('─'.repeat(45));

    // Read schema file
    let schema;
    try {
        schema = readFileSync(schemaPath, 'utf-8');
        console.log(`✅ Loaded schema from ${schemaPath}`);
    } catch (err) {
        console.error(`❌ Could not read schema.sql: ${err.message}`);
        process.exit(1);
    }

    // Connect without specifying a database (schema.sql creates it)
    let connection;
    try {
        connection = await createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });
        console.log(`✅ Connected to MySQL at ${process.env.DB_HOST || 'localhost'}`);
    } catch (err) {
        console.error(`❌ Could not connect to MySQL: ${err.message}`);
        console.error('   Make sure MySQL is running and .env credentials are correct.');
        process.exit(1);
    }

    // Execute schema
    try {
        await connection.query(schema);
        console.log(`✅ Schema applied — database "${process.env.DB_NAME || 'picnic_app'}" is ready`);
    } catch (err) {
        console.error(`❌ Error executing schema: ${err.message}`);
        process.exit(1);
    } finally {
        await connection.end();
    }

    console.log('─'.repeat(45));
    console.log('🎉 Database initialization complete!');
    console.log('   Run `npm start` to launch the server.');
}

initDatabase();
