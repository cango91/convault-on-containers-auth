const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.AUTH_DATABASE_URL, {
      // options
    });
    console.log(`DB connected`);
  } catch (error) {
    console.log(`DB connection failed: ${error}`);
    // Handle error
  }
};
module.exports = connectDB;