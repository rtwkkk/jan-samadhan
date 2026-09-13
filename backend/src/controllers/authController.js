const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    const isOfficial = role === 'admin' || role === 'official';

    let userExists = await Admin.findOne({ email });
    if (!userExists) userExists = await User.findOne({ email });
    if (!userExists) {
      const Institution = require('../models/Institution');
      userExists = await Institution.findOne({ email });
    }
    if (!userExists) {
      const Industry = require('../models/Industry');
      userExists = await Industry.findOne({ email });
    }

    if (userExists) {
      return res.status(409).json({ message: 'User already exists' });
    }

    let user;
    if (isOfficial) {
      user = await Admin.create({
        name,
        email,
        phone,
        password,
        role: 'admin'
      });
    } else {
      if (role === 'institution') {
        const Institution = require('../models/Institution');
        user = await Institution.create({
          name,
          email,
          phone,
          password
        });
      } else if (role === 'industry') {
        const Industry = require('../models/Industry');
        user = await Industry.create({
          name,
          email,
          phone,
          password,
          brandName: req.body.brandName,
          organizationType: req.body.organizationType,
          industrySector: req.body.industrySector,
          primaryBusinessArea: req.body.primaryBusinessArea,
          yearEstablished: req.body.yearEstablished,
          headquarters: req.body.headquarters,
          website: req.body.website,
          district: req.body.district,
          state: req.body.state,
          cin: req.body.cin,
          llpin: req.body.llpin,
          gstin: req.body.gstin,
          udyamNumber: req.body.udyamNumber,
          pan: req.body.pan,
          collaborationCapabilities: req.body.collaborationCapabilities || [],
          expertiseAreas: req.body.expertiseAreas,
          relevantProjects: req.body.relevantProjects,
          rndCapability: req.body.rndCapability,
          geoAreas: req.body.geoAreas,
          authRepName: req.body.authRepName,
          authRepDesignation: req.body.authRepDesignation,
          authRepEmail: req.body.authRepEmail,
          authRepPhone: req.body.authRepPhone,
          location: req.body.location || '',
          focusAreas: req.body.focusAreas || []
        });
      } else {
        user = await User.create({
          name,
          email,
          phone,
          password,
          role: role || 'user',
          verificationStatus: role === 'user' ? 'Approved' : 'Pending'
        });
      }
    }

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        first_name: user.name.split(' ')[0],
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    let user = await User.findOne({ email }).select('+password');
    let isAdmin = false;

    if (!user) {
      user = await Admin.findOne({ email }).select('+password');
      isAdmin = !!user;
    }
    
    if (!user) {
      const Institution = require('../models/Institution');
      user = await Institution.findOne({ email }).select('+password');
    }

    if (!user) {
      const Industry = require('../models/Industry');
      user = await Industry.findOne({ email }).select('+password');
    }

    if (user && (await user.matchPassword(password))) {
      // Check verification status for institution and industry
      if (user.role === 'institution' || user.role === 'industry') {
        if (user.verificationStatus === 'Pending') {
          return res.status(403).json({ message: 'Your account is pending admin verification. You will be able to log in after your account has been approved.' });
        }
        if (user.verificationStatus === 'Rejected') {
          return res.status(403).json({ message: 'Your account registration was not approved. Please contact the administrator for further information.' });
        }
      }

      res.json({
        _id: user.id,
        name: user.name,
        first_name: user.name.split(' ')[0],
        email: user.email,
        role: user.role, // role will be 'admin' for admins
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      user = await Admin.findById(req.user.id);
    }
    if (!user) {
      const Institution = require('../models/Institution');
      user = await Institution.findById(req.user.id);
    }
    if (!user) {
      const Industry = require('../models/Industry');
      user = await Industry.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userData = user.toObject ? user.toObject() : user;
    userData.first_name = user.name.split(' ')[0];
    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    let isOfficial = false;
    if (!user) {
      user = await Admin.findById(req.user.id);
      isOfficial = !!user;
    }
    if (!user) {
      const Institution = require('../models/Institution');
      user = await Institution.findById(req.user.id);
    }
    if (!user) {
      const Industry = require('../models/Industry');
      user = await Industry.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Explicitly destructure only allowed fields to protect the phone number
    const { name, email } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      first_name: updatedUser.name.split(' ')[0],
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin only route example
// @route   GET /api/auth/admin-only
// @access  Private/Admin
const adminOnlyRoute = async (req, res) => {
  res.json({ message: 'Welcome to the admin area!', user: req.user });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  adminOnlyRoute
};
