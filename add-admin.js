const connectDB = require('./lms-backend/config/db');
const User = require('./lms-backend/models/User');
const bcrypt = require('bcryptjs');

// Connect to MongoDB using the same method as the backend server
connectDB();

const createAdminUser = async () => {
  try {
    // Wait a bit for the connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('An admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create a new admin user
    const hashedPassword = await bcrypt.hash('admin123', 10); // Default password: admin123
    
    const adminUser = new User({
      name: 'Admin User',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    await adminUser.save();
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login for security.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();