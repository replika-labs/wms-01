const bcrypt = require('bcrypt');
const { User } = require('../models');
const asyncHandler = require('express-async-handler');

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Admin
const getUsers = asyncHandler(async (req, res) => {
  try {
    // Build query conditions based on query parameters
    const whereConditions = {};
    
    // Filter by role if provided
    if (req.query.role) {
      whereConditions.role = req.query.role;
    }
    
    // Filter by active status if provided
    if (req.query.isActive !== undefined) {
      whereConditions.isActive = req.query.isActive === 'true';
    }
    
    // Filter by login enabled status if provided
    if (req.query.loginEnabled !== undefined) {
      whereConditions.loginEnabled = req.query.loginEnabled === 'true';
    }

    const users = await User.findAll({
      where: whereConditions,
      attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone', 'role', 'isActive', 'loginEnabled', 'createdAt']
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// @desc    Get user by ID
// @route   GET /api/auth/users/:id
// @access  Admin
const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone', 'role', 'loginEnabled', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// @desc    Create a new user
// @route   POST /api/auth/users
// @access  Admin
const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, whatsappPhone, password, role, loginEnabled } = req.body;

  // Validate input
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    // Check if user exists
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      whatsappPhone,
      passwordHash,
      role: role || 'penjahit',
      loginEnabled: loginEnabled !== undefined ? loginEnabled : true
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsappPhone: user.whatsappPhone,
      role: user.role,
      loginEnabled: user.loginEnabled
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Admin
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, phone, whatsappPhone, password, role, loginEnabled } = req.body;
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (whatsappPhone !== undefined) user.whatsappPhone = whatsappPhone;
    if (role) user.role = role;
    if (loginEnabled !== undefined) user.loginEnabled = loginEnabled;
    
    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsappPhone: user.whatsappPhone,
      role: user.role,
      loginEnabled: user.loginEnabled
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// @desc    Toggle user status (activate/deactivate)
// @route   PUT /api/auth/users/:id/toggle-status
// @access  Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { loginEnabled } = req.body;
  
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Toggle or set loginEnabled status
    user.loginEnabled = loginEnabled !== undefined ? loginEnabled : !user.loginEnabled;
    
    await user.save();
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsappPhone: user.whatsappPhone,
      role: user.role,
      loginEnabled: user.loginEnabled
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
});

// @desc    Get penjahit users for dropdown
// @route   GET /api/auth/users/penjahit
// @access  Admin
const getPenjahitUsers = asyncHandler(async (req, res) => {
  try {
    const penjahitUsers = await User.findAll({
      where: { 
        role: 'penjahit',
        isActive: true,
        loginEnabled: true
      },
      attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone'],
      order: [['name', 'ASC']]
    });
    
    res.json(penjahitUsers);
  } catch (error) {
    console.error('Error fetching penjahit users:', error);
    res.status(500).json({ message: 'Failed to fetch penjahit users' });
  }
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  getPenjahitUsers
};