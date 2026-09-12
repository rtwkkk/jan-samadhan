require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.local.example' });
console.log("URI: " + (process.env.MONGODB_URI ? "PRESENT" : "MISSING"));
console.log("DB: " + (process.env.MONGODB_DB_NAME ? process.env.MONGODB_DB_NAME : "MISSING"));
