const mongoose = require('mongoose');
const Institution = require('./models/Institution');
const User = require('./models/User');

const seedInstitutions = async () => {
  try {
    const count = await Institution.countDocuments();
    if (count > 0) {
      console.log('Institutions already seeded.');
    } else {
      console.log('Seeding institutions...');
      const institutionsData = [
        {
          name: 'BIT Mesra',
          type: 'Engineering College',
          aisheCode: 'U-0202',
          district: 'Ranchi',
          emailDomain: 'bitmesra.ac.in',
          departments: ['CSE', 'Civil', 'Mechanical', 'Electrical'],
          researchDomains: ['AI/ML', 'IoT', 'Robotics'],
          facilities: 5,
          similarProjectsCompleted: 12
        },
        {
          name: 'BIT Sindri',
          type: 'Engineering College',
          aisheCode: 'U-0203',
          district: 'Dhanbad',
          emailDomain: 'bitsindri.ac.in',
          departments: ['CSE', 'Mining', 'Metallurgy', 'Mechanical'],
          researchDomains: ['Mining Tech', 'Materials', 'Renewable Energy'],
          facilities: 4,
          similarProjectsCompleted: 8
        },
        {
          name: 'ISM Dhanbad',
          type: 'University',
          aisheCode: 'U-0204',
          district: 'Dhanbad',
          emailDomain: 'iitism.ac.in',
          departments: ['CSE', 'Mining', 'Petroleum', 'Earth Sciences'],
          researchDomains: ['Geology', 'AI/ML', 'Energy'],
          facilities: 8,
          similarProjectsCompleted: 25
        },
        {
          name: 'NIT Jamshedpur',
          type: 'Engineering College',
          aisheCode: 'U-0205',
          district: 'Jamshedpur',
          emailDomain: 'nitjsr.ac.in',
          departments: ['CSE', 'Civil', 'Mechanical', 'Production'],
          researchDomains: ['Manufacturing', 'Smart Infrastructure', 'AI'],
          facilities: 6,
          similarProjectsCompleted: 15
        }
      ];

      for (let instData of institutionsData) {
        instData.password = 'password123';
        const inst = await Institution.create(instData);
        
        // Create user account for the institution
        const email = `admin@${instData.emailDomain}`;
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
          await User.create({
            name: `${instData.name} Admin`,
            email: email,
            phone: '9999999999',
            password: 'password123',
            role: 'institution',
            institutionId: inst._id
          });
        }
      }
      console.log('Institutions seeded successfully!');
    }

    const Industry = require('./models/Industry');
    const industryCount = await Industry.countDocuments();
    if (industryCount === 0) {
      console.log('Seeding industries...');
      await Industry.create([
        {
          name: 'Tata Steel',
          industryType: 'Manufacturing',
          collaborationStatus: 'Active',
          associatedProjects: [],
          email: 'admin@tatasteel.com',
          phone: '9999999991',
          password: 'password123'
        },
        {
          name: 'Wipro',
          industryType: 'IT Services',
          collaborationStatus: 'Active',
          associatedProjects: [],
          email: 'admin@wipro.com',
          phone: '9999999992',
          password: 'password123'
        },
        {
          name: 'Jindal Steel and Power',
          industryType: 'Manufacturing',
          collaborationStatus: 'Pending',
          associatedProjects: [],
          email: 'admin@jindalsteel.com',
          phone: '9999999993',
          password: 'password123'
        }
      ]);
      console.log('Industries seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

module.exports = seedInstitutions;
