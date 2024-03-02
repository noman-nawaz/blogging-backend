const mongoose = require('mongoose');

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.log('Error connecting', err);
    } 
};

module.exports = dbConnect;
