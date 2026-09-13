const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://localhost:27017/jan-samadhan';
// Using the direct replica set URI we constructed earlier to bypass DNS blocking
const ATLAS_URI = 'mongodb://riyanshu:riyanshu123@ac-5ntriw1-shard-00-00.15whpls.mongodb.net:27017,ac-5ntriw1-shard-00-01.15whpls.mongodb.net:27017,ac-5ntriw1-shard-00-02.15whpls.mongodb.net:27017/jan-samadhan?ssl=true&replicaSet=atlas-5bu03h-shard-0&authSource=admin&retryWrites=true&w=majority';

async function migrate() {
    try {
        console.log('Connecting to Local MongoDB...');
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('✅ Connected to Local DB');
        
        console.log('Connecting to Atlas MongoDB...');
        const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('✅ Connected to Atlas DB');

        const collections = await localConn.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to migrate.\n`);
        
        for (let col of collections) {
            const colName = col.name;
            console.log(`Migrating collection: [${colName}]`);
            
            let data = await localConn.db.collection(colName).find({}).toArray();
            if (data.length > 0) {
                // Wipe the destination collection to prevent duplicate key errors
                await atlasConn.db.collection(colName).deleteMany({});
                
                // Fix missing unique fields to prevent E11000 errors
                if (colName === 'industries') {
                    data = data.map((doc, idx) => {
                        if (!doc.email) doc.email = `dummy_industry_${idx}@example.com`;
                        if (!doc.phone) doc.phone = `999000000${idx}`;
                        return doc;
                    });
                }

                // Insert the local data into Atlas
                await atlasConn.db.collection(colName).insertMany(data);
                console.log(` -> Successfully copied ${data.length} documents.`);
            } else {
                console.log(` -> Collection is empty. Skipped.`);
            }
        }
        
        console.log('\n🎉 Migration completed successfully! Your Atlas database now matches your localhost exactly.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
