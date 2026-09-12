const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    return;
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const configs = await db.collection('whatsappconfigs').find({}).toArray();
  const contacts = await db.collection('contacts').find({}).toArray();
  
  console.log('Configs:');
  for (const c of configs) {
    console.log(`  AccountId: ${c.accountId}, PhoneId: ${c.phoneNumberId}, WabaId: ${c.wabaId}`);
  }
  
  console.log('Contacts:');
  for (const c of contacts) {
    console.log(`  Id: ${c._id}, Phone: ${c.phone}, Name: ${c.name}`);
  }
  
  await client.close();
}
run().catch(console.error);
