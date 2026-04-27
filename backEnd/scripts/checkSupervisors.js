import mongoose from 'mongoose';
import "dotenv/config";
import Supervisor from '../models/Supervisor.js';

async function checkSupervisors() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🟢 Connected to MongoDB');
        const count = await Supervisor.countDocuments();
        console.log(`Number of supervisors found: ${count}`);
        const supervisors = await Supervisor.find({}, 'name documentNumber');
        console.log('Supervisors in DB:', JSON.stringify(supervisors, null, 2));
    } catch (error) {
        console.error('🔴 Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

checkSupervisors();
