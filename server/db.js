import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
try {
  const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
  if (result.error) {
    console.warn('Warning: Could not load .env file from root directory:', result.error.message);
    console.log('Will use process environment variables only');
  } else {
    console.log('Successfully loaded environment variables from root .env file');
  }
} catch (error) {
  console.warn('Warning: Error loading .env file:', error.message);
  console.log('Will use process environment variables only');
}

// Pool is imported directly from pg

// Create a new PostgreSQL connection pool
let pool;
let dbConnected = false;
let connectionPromise;

try {
  // Check for DATABASE_URL in environment variables
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('Attempting to connect to database with provided DATABASE_URL');
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for some Supabase PostgreSQL connections
    }
  });

  // Initialize connection promise
  connectionPromise = pool.connect()
    .then(client => {
      console.log('✅ Database connection successful');
      dbConnected = true;
      client.release();
      return true;
    })
    .catch(err => {
      console.error('❌ Database connection error:', err.message);
      process.exit(1); // Exit the process if database connection fails
    });
} catch (error) {
  console.error('❌ Failed to initialize database pool:', error.message);
  process.exit(1); // Exit the process if database connection fails
}

/**
 * Execute a SQL query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @param {Object} options - Additional options
 * @param {boolean} options.useTransaction - Whether to use a transaction
 * @returns {Promise<Object>} - Query result
 */
export async function query(text, params, options = {}) {
  const { useTransaction = false } = options;
  let client = null;
  
  try {
    const start = Date.now();
    let res;
    
    if (useTransaction) {
      // Get a client from the pool for a transaction
      client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        res = await client.query(text, params);
        await client.query('COMMIT');
      } catch (txError) {
        // If anything goes wrong, roll back the transaction
        await client.query('ROLLBACK');
        console.error('Transaction error, rolled back:', txError.message);
        throw txError;
      } finally {
        // Always release the client back to the pool
        client.release();
      }
    } else {
      // Use the pool directly for simple queries
      res = await pool.query(text, params);
    }
    
    const duration = Date.now() - start;
    console.log('Executed query', { 
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      duration, 
      rows: res.rowCount,
      transaction: useTransaction
    });
    
    return res;
  } catch (error) {
    // Enhance error with query information for better debugging
    error.query = text;
    error.params = params;
    console.error('Query error:', {
      message: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params
    });
    
    // Re-throw the error to be handled by the calling function
    throw error;
  } finally {
    // Ensure client is released if it was acquired but not released
    if (client && useTransaction) {
      try {
        client.release(true); // Force release in case of errors
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError.message);
      }
    }
  }
}

// Export the pool and query function
export default {
  query,
  pool,
  connectionPromise,
  getStatus: () => ({
    connected: dbConnected
  })
};
