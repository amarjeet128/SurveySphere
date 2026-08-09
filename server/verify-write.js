const mongoose = require('mongoose');
require('dotenv').config();
const Survey = require('./models/Survey');

async function verifyWrite() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    
    const survey = new Survey({
      adminId: new mongoose.Types.ObjectId(), // Fake admin ID
      title: 'TEST_ATLAS_WRITE_SURVEY',
      type: 'survey',
      description: 'Verifying database connection',
      questions: [],
      status: 'Draft'
    });
    
    console.log('Model db name:', Survey.db.name);
    console.log('Model db host:', Survey.db.host);

    await survey.save();
    console.log('Survey successfully saved to database!');
    
    // Check if it exists
    const found = await Survey.findOne({ title: 'TEST_ATLAS_WRITE_SURVEY' });
    if (found) {
        console.log('Verified: Survey exists in', Survey.db.name);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyWrite();
