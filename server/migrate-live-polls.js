const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const Survey = require('./models/Survey');
const LivePoll = require('./models/LivePoll');

const migrateData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/surveysphere';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Find all live polls in the Survey collection
    const livePolls = await Survey.find({ type: 'live' });
    console.log(`Found ${livePolls.length} live polls to migrate.`);

    if (livePolls.length > 0) {
      // 2. Insert into LivePolls collection
      const docsToInsert = livePolls.map(poll => {
        const obj = poll.toObject();
        // keep the same _id so URLs and references still work
        return obj; 
      });

      // Use insertMany but handle duplicates just in case
      for (const doc of docsToInsert) {
        const existing = await LivePoll.findById(doc._id);
        if (!existing) {
          await LivePoll.create(doc);
          console.log(`Migrated live poll: ${doc.title}`);
        } else {
          console.log(`Skipping ${doc.title} - already migrated`);
        }
      }

      // 3. Remove them from the Survey collection
      const result = await Survey.deleteMany({ type: 'live' });
      console.log(`Deleted ${result.deletedCount} live polls from the Survey collection.`);
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateData();
