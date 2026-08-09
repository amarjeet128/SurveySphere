const mongoose = require('mongoose');
const Survey = require('./models/Survey');
require('dotenv').config();

async function testUpdate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Find any survey
    const survey = await Survey.findOne({});
    if (!survey) {
      console.log('No survey found');
      return;
    }
    
    console.log('Original status:', survey.status);
    survey.status = 'Closed';
    await survey.save();
    console.log('Changed to Closed');

    survey.status = 'Active';
    // Let's mimic what controller does
    survey.title = undefined || survey.title;
    survey.description = undefined !== undefined ? undefined : survey.description;
    survey.questions = undefined || survey.questions;
    survey.theme = undefined || survey.theme;
    survey.settings = undefined || survey.settings;
    
    await survey.save();
    console.log('Changed back to Active successfully:', survey.status);

  } catch (error) {
    console.error('Error updating:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testUpdate();
