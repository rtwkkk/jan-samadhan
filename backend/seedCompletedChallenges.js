require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

const Challenge = require('./src/models/Challenge');
const Institution = require('./src/models/Institution');
const Industry = require('./src/models/Industry');
const Project = require('./src/models/Project');
const StudentTeam = require('./src/models/StudentTeam');
const IndustryCollaboration = require('./src/models/IndustryCollaboration');
const User = require('./src/models/User');

const seedData = async () => {
  await connectDB();

  try {
    console.log('Seeding completed challenges data...');

    // 1. Create or Find Institution
    let institution = await Institution.findOne({ name: 'BIT Mesra' });
    if (!institution) {
      institution = await Institution.create({
        name: 'BIT Mesra',
        address: 'Mesra, Ranchi',
        type: 'University',
        nodalOfficer: 'Dr. Ramesh Kumar',
        contactEmail: 'ramesh@bitmesra.ac.in',
        contactPhone: '9876543210',
        departments: ['Computer Science', 'Electronics', 'Mechanical']
      });
    }

    // 2. Create or Find Industry
    let industry = await Industry.findOne({ name: 'Tata Steel' });
    if (!industry) {
      industry = await Industry.create({
        name: 'Tata Steel',
        industryType: 'Manufacturing',
        location: 'Jamshedpur, Jharkhand',
        email: 'anil.sharma@tatasteel.com',
        phone: '9988776655',
        password: 'password123'
      });
    }

    // 3. Create or Find Faculty User
    let faculty = await User.findOne({ email: 'faculty@bitmesra.ac.in' });
    if (!faculty) {
      faculty = await User.create({
        name: 'Dr. Ramesh Kumar',
        email: 'faculty@bitmesra.ac.in',
        password: 'password123',
        role: 'institution',
        phone: '9876543211',
        institutionId: institution._id
      });
    }

    // 4. Create Completed Challenge 1
    const challenge1 = await Challenge.create({
      title: 'Smart Water ATM Deployment in Simdega',
      description: 'Lack of clean drinking water in remote villages of Simdega. Need an IoT-enabled affordable water dispensing system.',
      department: 'Water Resources',
      urgencySeverity: 'High',
      district: 'Simdega',
      villageCityBlock: 'Kolebira Block',
      peopleAffected: 2500,
      fullName: 'Suresh Munda',
      mobileNumber: '9123456780',
      consent: true,
      status: 'resolved',
      resolvedAt: new Date('2026-08-15'),
      assignment: {
        institution_id: institution._id,
        institution_name: institution.name,
        department: 'Water Resources',
        professor_name: faculty.name
      }
    });

    // Project 1
    const project1 = await Project.create({
      challengeId: challenge1._id,
      title: 'Jal Jiwan IoT ATM',
      institutionId: institution._id,
      facultyMentor: faculty.name,
      status: 'Completed',
      progress: 100,
      budget: 'Approved (₹1,50,000)'
    });

    // Team 1
    await StudentTeam.create({
      name: 'AquaTech Innovators',
      institutionId: institution._id,
      projectId: project1._id,
      facultyMentor: faculty.name,
      students: ['Amit Patel', 'Neha Singh', 'Rahul Verma'],
      departments: ['Computer Science', 'Electronics'],
      skills: ['IoT', 'Embedded Systems', 'Cloud Computing'],
      status: 'Completed'
    });

    // Industry Collab 1
    await IndustryCollaboration.create({
      industryId: industry._id,
      projectId: project1._id,
      institutionId: institution._id,
      supportOffered: ['Hardware Components', 'Mentorship', 'Funding'],
      contributionDetails: 'Provided IoT sensors and ₹50,000 funding',
      status: 'Completed'
    });

    // 5. Create Completed Challenge 2
    const challenge2 = await Challenge.create({
      title: 'AI Crop Advisory App for Gumla Farmers',
      description: 'Farmers in Gumla are facing crop failure due to unpredictable weather and pests. Need an AI app for early warnings and advisory.',
      department: 'Agriculture',
      urgencySeverity: 'Critical',
      district: 'Gumla',
      villageCityBlock: 'Bishunpur Block',
      peopleAffected: 4000,
      fullName: 'Ram Lakhan Oraon',
      mobileNumber: '9123456781',
      consent: true,
      status: 'resolved',
      resolvedAt: new Date('2026-09-01'),
      assignment: {
        institution_id: institution._id,
        institution_name: institution.name,
        department: 'Agriculture',
        professor_name: faculty.name
      }
    });

    // Project 2
    const project2 = await Project.create({
      challengeId: challenge2._id,
      title: 'Kisan Mitra AI App',
      institutionId: institution._id,
      facultyMentor: faculty.name,
      status: 'Completed',
      progress: 100,
      budget: 'Approved (₹80,000)'
    });

    // Team 2
    await StudentTeam.create({
      name: 'AgriTech Pioneers',
      institutionId: institution._id,
      projectId: project2._id,
      facultyMentor: faculty.name,
      students: ['Priya Das', 'Sanjay Kumar'],
      departments: ['Computer Science'],
      skills: ['Machine Learning', 'App Development', 'UI/UX'],
      status: 'Completed'
    });

    // Industry Collab 2
    const industry2 = await Industry.findOne({ name: 'Reliance Jio' }) || await Industry.create({
      name: 'Reliance Jio',
      industryType: 'IT & Telecom',
      location: 'Ranchi, Jharkhand',
      email: 'sunita@jio.com',
      phone: '9988776644',
      password: 'password123'
    });

    await IndustryCollaboration.create({
      industryId: industry2._id,
      projectId: project2._id,
      institutionId: institution._id,
      supportOffered: ['Cloud Hosting', 'Data Access'],
      contributionDetails: 'Provided free cloud hosting and agricultural dataset access',
      status: 'Completed'
    });

    console.log('Seed data inserted successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();
