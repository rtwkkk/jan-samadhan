require('dotenv').config();
const mongoose = require('mongoose');
const Challenge = require('./src/models/Challenge');
const Institution = require('./src/models/Institution');
const Solution = require('./src/models/Solution');

async function seedSolutions() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Make sure we have at least one Challenge and one Institution to reference
    let challenge = await Challenge.findOne();
    if (!challenge) {
      challenge = await Challenge.create({
        title: "Clean Water Access in Rural Areas",
        description: "Villages in district lack access to clean drinking water leading to health issues.",
        district: "Ranchi",
        villageCityBlock: "Kanke",
        peopleAffected: 5000,
        fullName: "Admin",
        mobileNumber: "9999999999",
        consent: true,
        urgencySeverity: "High"
      });
      console.log('Created dummy Challenge');
    }

    let institution = await Institution.findOne();
    if (!institution) {
      institution = await Institution.create({
        name: "National Institute of Technology",
        code: "NITR",
        type: "University",
        state: "Jharkhand",
        district: "Ranchi"
      });
      console.log('Created dummy Institution');
    }

    // Clear existing dummy solutions if any
    await Solution.deleteMany({});

    const solutionsData = [
      {
        challenge: challenge._id,
        institution: institution._id,
        solutionStatement: "Solar-Powered Water Purification System",
        solutionDescription: "Deploying low-cost, solar-powered RO purifiers in community centers to provide clean drinking water. The system will include IoT sensors to monitor water quality and usage remotely.",
        teamComposition: {
          numberOfMembers: 5,
          details: "1 Faculty Mentor, 4 Engineering Students"
        },
        collegeDepartment: "Department of Environmental Engineering",
        expectedCompletionTime: "6 Months",
        status: "Proposed"
      },
      {
        challenge: challenge._id,
        institution: institution._id,
        solutionStatement: "Rainwater Harvesting and Filtration Units",
        solutionDescription: "Constructing community-level rainwater harvesting structures equipped with multi-stage bio-sand filters. This sustainable approach aims to recharge local aquifers and provide filtered water.",
        teamComposition: {
          numberOfMembers: 3,
          details: "2 Researchers, 1 Project Lead"
        },
        collegeDepartment: "Civil Engineering Department",
        expectedCompletionTime: "8 Months",
        status: "Proposed"
      }
    ];

    await Solution.insertMany(solutionsData);
    console.log('Successfully seeded 2 dummy solutions');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding solutions:', err);
    process.exit(1);
  }
}

seedSolutions();
