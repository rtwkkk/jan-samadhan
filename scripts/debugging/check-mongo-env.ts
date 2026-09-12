const uri = process.env.MONGODB_URI;
const db = process.env.MONGODB_DB_NAME;

if (!uri) {
  console.log("MISSING: MONGODB_URI");
  process.exit(1);
}
if (!db) {
  console.log("MISSING: MONGODB_DB_NAME");
  process.exit(1);
}

console.log("ENV VARS PRESENT");
console.log(`DB_NAME: ${db}`);
