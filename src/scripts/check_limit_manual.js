const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';


async function test() {
    try {
        
        
        
        
        console.log("Automated test requires complex auth flow setup.");
        console.log("Please perform Manual Verification:");
        console.log("1. Login as Parent with 'Single Plan'.");
        console.log("2. Add 1 child (should succeed).");
        console.log("3. Add 2nd child (should fail with 403).");
    } catch (e) {
        console.error(e);
    }
}
test();
