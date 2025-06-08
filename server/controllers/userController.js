const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const asyncHandler = require('express-async-handler');

const prisma = new PrismaClient();

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

    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappPhone: true,
        role: true,
        isActive: true,
        loginEnabled: true,
        createdAt: true
      }
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
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappPhone: true,
        role: true,
        loginEnabled: true,
        createdAt: true
      }
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
    const userExists = await prisma.user.findUnique({
      where: { email }
    });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        whatsappPhone,
        passwordHash,
        role: role || 'OPERATOR',
        loginEnabled: loginEnabled !== undefined ? loginEnabled : true
      }
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
  const userId = parseInt(req.params.id);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone;
    if (role) updateData.role = role;
    if (loginEnabled !== undefined) updateData.loginEnabled = loginEnabled;

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      whatsappPhone: updatedUser.whatsappPhone,
      role: updatedUser.role,
      loginEnabled: updatedUser.loginEnabled
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
  const userId = parseInt(req.params.id);
  const { loginEnabled } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Toggle or set loginEnabled status
    const newLoginEnabled = loginEnabled !== undefined ? loginEnabled : !user.loginEnabled;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { loginEnabled: newLoginEnabled }
    });

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      whatsappPhone: updatedUser.whatsappPhone,
      role: updatedUser.role,
      loginEnabled: updatedUser.loginEnabled
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
});

// @desc    Get operator users for dropdown
// @route   GET /api/auth/users/operators
// @access  Admin
const getOperatorUsers = asyncHandler(async (req, res) => {
  try {
    const operatorUsers = await prisma.user.findMany({
      where: {
        role: 'OPERATOR',
        isActive: true,
        loginEnabled: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappPhone: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(operatorUsers);
  } catch (error) {
    console.error('Error fetching operator users:', error);
    res.status(500).json({ message: 'Failed to fetch operator users' });
  }
});

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  getOperatorUsers,
  deleteUser
};