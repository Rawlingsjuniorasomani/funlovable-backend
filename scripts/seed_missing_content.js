const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/db/pool');

const SUBJECT_CONTENT = {
    'mathematics': { module: 'Number and Numerals', lesson: 'Sets and Operations' },
    'english language': { module: 'Grammar', lesson: 'Nouns and Pronouns' },
    'integrated science': { module: 'Diversity of Matter', lesson: 'Living and Non-Living Things' },
    'social studies': { module: 'Environment', lesson: 'Our Physical Environment' },
    'french': { module: 'Salutations', lesson: 'Greetings' },
    'ict': { module: 'Introduction to Computers', lesson: 'Parts of a Computer' },
    'creative arts': { module: 'Visual Arts', lesson: 'Drawing tools' },
    'rme': { module: 'Creation Stories', lesson: 'God and Creation' },
    'default': { module: 'Introduction', lesson: 'Overview' }
};

async function seedMissingContent() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding missing content...');

        // Get all subjects
        const subjects = await client.query('SELECT id, name FROM subjects');

        for (const sub of subjects.rows) {
            // Check if modules exist
            const modCheck = await client.query('SELECT count(*) FROM modules WHERE subject_id = $1', [sub.id]);
            const count = parseInt(modCheck.rows[0].count);

            if (count === 0) {
                console.log(`Creating content for ${sub.name} (${sub.id})...`);

                const key = sub.name.toLowerCase().trim();
                const content = SUBJECT_CONTENT[key] || SUBJECT_CONTENT['default'];

                // Create Module
                const modRes = await client.query(
                    'INSERT INTO modules (subject_id, title, description, order_index) VALUES ($1, $2, $3, 1) RETURNING id',
                    [sub.id, content.module, `First module for ${sub.name}`]
                );
                const modId = modRes.rows[0].id;

                // Create Lesson
                await client.query(
                    'INSERT INTO lessons (module_id, title, content, order_index) VALUES ($1, $2, $3, 1)',
                    [modId, content.lesson, `This is the first lesson on ${content.lesson}. Contents coming soon.`]
                );

                console.log(`✅ Added module "${content.module}" and lesson "${content.lesson}"`);
            } else {
                console.log(`Skipping ${sub.name} (${sub.id}) - already has ${count} modules.`);
            }
        }
        console.log('✨ Seeding complete!');

    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        client.release();
        process.exit();
    }
}

seedMissingContent();
