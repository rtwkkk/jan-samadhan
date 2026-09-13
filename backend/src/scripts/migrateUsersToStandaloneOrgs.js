require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Industry = require('../models/Industry');

async function migrate() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jansamadhan';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const users = await User.find({ role: { $in: ['institution', 'industry'] } }).select('+password');
    console.log(`Found ${users.length} users to migrate to standalone orgs.`);

    for (const user of users) {
      if (user.role === 'institution' && user.institutionId) {
        console.log(`Migrating auth data for institution user: ${user.email}`);
        const inst = await Institution.findById(user.institutionId);
        if (inst) {
          inst.password = user.password;
          inst.role = user.role;
          inst.verificationStatus = user.verificationStatus;
          // Avoid triggering pre('save') hook that hashes an already hashed password
          await Institution.collection.updateOne({ _id: inst._id }, {
            $set: {
              password: user.password,
              role: user.role,
              verificationStatus: user.verificationStatus
            }
          });
          await User.deleteOne({ _id: user._id });
        }
      } else if (user.role === 'industry' && user.industryId) {
        console.log(`Migrating auth data for industry user: ${user.email}`);
        const ind = await Industry.findById(user.industryId);
        if (ind) {
          ind.password = user.password;
          ind.role = user.role;
          ind.verificationStatus = user.verificationStatus;
          await Industry.collection.updateOne({ _id: ind._id }, {
            $set: {
              password: user.password,
              role: user.role,
              verificationStatus: user.verificationStatus
            }
          });
          await User.deleteOne({ _id: user._id });
        }
      }
    }

    console.log('Migration to standalone orgs completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
