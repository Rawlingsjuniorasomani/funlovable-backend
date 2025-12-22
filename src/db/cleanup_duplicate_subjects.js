const pool = require('./pool');

async function cleanupDuplicates() {
    try {
        console.log('Starting cleanup...');

        
        const result = await pool.query('SELECT id, name FROM subjects ORDER BY name');
        const subjects = result.rows;

        const seen = new Map();
        const duplicates = [];

        for (const subject of subjects) {
            if (seen.has(subject.name)) {
                duplicates.push(subject.id);
            } else {
                seen.set(subject.name, subject.id);
            }
        }

        console.log(`Found ${duplicates.length} duplicates.`);

        
        for (const id of duplicates) {
            try {
                await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
                console.log(`Deleted subject with ID: ${id}`);
            } catch (err) {
                console.error(`Failed to delete subject ${id}: ${err.message}`);
                
                
            }
        }

        console.log('Cleanup complete.');
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        pool.end();
    }
}

cleanupDuplicates();
