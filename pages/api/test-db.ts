// pages/api/test-db.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await pool.connect();
  
  try {
    // Test basic connection
    const result = await client.query('SELECT NOW() as current_time');
    
    // Test table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_logs'
      );
    `);
    
    // Count existing records
    const countResult = await client.query('SELECT COUNT(*) FROM chat_logs');
    
    res.status(200).json({
      connection: 'success',
      currentTime: result.rows[0].current_time,
      tableExists: tableCheck.rows[0].exists,
      recordCount: countResult.rows[0].count,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error.message 
    });
  } finally {
    client.release();
  }
}
