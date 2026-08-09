const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://localhost:27017/surveysphere';
const ATLAS_URI = 'mongodb://nayakajay349_db_user:Amar123@ac-70ix3sq-shard-00-00.yxpni00.mongodb.net:27017,ac-70ix3sq-shard-00-01.yxpni00.mongodb.net:27017,ac-70ix3sq-shard-00-02.yxpni00.mongodb.net:27017/surveysphere?ssl=true&authSource=admin&replicaSet=atlas-4oq7u7-shard-0&appName=Cluster0';

async function migrate() {
  let localClient;
  let atlasClient;

  try {
    console.log('Connecting to local MongoDB...');
    localClient = await MongoClient.connect(LOCAL_URI);
    const localDb = localClient.db();
    
    console.log('Connecting to MongoDB Atlas...');
    atlasClient = await MongoClient.connect(ATLAS_URI);
    
    console.log('Dropping conflicting SurveySphere (uppercase) if exists...');
    await atlasClient.db('SurveySphere').dropDatabase();
    
    const atlasDb = atlasClient.db();

    const collections = ['users', 'questions', 'responses', 'surveys'];

    for (const collectionName of collections) {
      console.log(`\nMigrating collection: ${collectionName}...`);
      
      const localCollection = localDb.collection(collectionName);
      const atlasCollection = atlasDb.collection(collectionName);

      // Get all documents
      const docs = await localCollection.find({}).toArray();
      console.log(`Found ${docs.length} documents in local ${collectionName}`);

      if (docs.length > 0) {
        // Clear atlas collection first just in case
        await atlasCollection.deleteMany({});
        
        // Insert docs
        await atlasCollection.insertMany(docs);
        console.log(`Successfully migrated ${docs.length} documents to Atlas ${collectionName}`);
      } else {
        console.log(`No documents to migrate for ${collectionName}`);
      }
    }

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

migrate();
