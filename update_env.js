const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

try {
    let content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const newLines = lines.filter(line => !line.trim().startsWith('CLIENT_URL='));
    newLines.push('CLIENT_URL=http://localhost:8080'); // Append new value
    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('Successfully updated .env with CLIENT_URL=http://localhost:8080');
} catch (err) {
    console.error('Failed to update .env:', err);
}
