const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserPreferences = require('../models/UserPreferences');
const auth = require('../middleware/auth');
const ImageKit = require('imagekit');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || ''
});


// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { userId, name, email, password } = req.body;

    if (!userId || !name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 8 || password.length > 15) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 15 characters long' });
    }

    // Check duplicate
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const userIdExists = await User.findOne({ userId });
    if (userIdExists) {
      return res.status(400).json({ success: false, message: 'User ID is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      userId,
      name,
      email,
      password: hashedPassword
    });

    // Create default preferences
    await UserPreferences.create({
      userId: user._id
    });

    return res.status(201).json({ success: true, message: 'Account registered successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error registering account', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      userId: user._id
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error during login', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const preferences = await UserPreferences.findOne({ userId: req.user._id });
    return res.json({
      success: true,
      user: {
        _id: req.user._id,
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar
      },
      preferences
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching profile details', error: error.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    if (name) req.user.name = name;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: req.user._id,
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
  }
});

// POST /api/auth/avatar
router.post('/avatar', auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    // Verify it is a valid base64 image data URL
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'Invalid image format. Must be base64 data URL.' });
    }

    const uploadResponse = await imagekit.upload({
      file: image, // base64 string
      fileName: `avatar_${req.user.userId}_${Date.now()}.png`,
      folder: '/avatars'
    });

    req.user.avatar = uploadResponse.url;
    await req.user.save();

    return res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      user: {
        _id: req.user._id,
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return res.status(500).json({ success: false, message: 'Error uploading avatar to ImageKit', error: error.message });
  }
});

// PUT /api/auth/preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const updatedPrefs = await UserPreferences.findOneAndUpdate(
      { userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    return res.json({ success: true, message: 'Preferences saved', preferences: updatedPrefs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating preferences', error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email address' });
    }

    // Generate numeric 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otpCode;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes expiration
    await user.save();

    // Output OTP to backend console/terminal
    console.log(`\n===========================================`);
    console.log(`[OTP Generation] Password reset requested for: ${email}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`===========================================\n`);

    return res.json({
      success: true,
      message: 'A 6-digit OTP code has been generated and printed to the server console.',
      otp: otpCode // Keep returning in JSON body for mock testing/UI automation compatibility
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error initiating password reset', error: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, otp, newPassword } = req.body;
    const verificationCode = otp || token;

    if (!verificationCode || !newPassword) {
      return res.status(400).json({ success: false, message: 'OTP code and new password are required' });
    }

    if (newPassword.length < 8 || newPassword.length > 15) {
      return res.status(400).json({ success: false, message: 'Password must be between 8 and 15 characters long' });
    }

    const user = await User.findOne({
      resetPasswordToken: verificationCode,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Your password has been reset successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
});

module.exports = router;
