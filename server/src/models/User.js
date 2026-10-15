import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must contain at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    // Password hash only; never store the original password.
    passwordHash: {
      type: String,
      select: false,
    },

    // Used for Google OAuth accounts.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    avatar: {
      type: String,
      default: null,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Password reset fields.
    passwordResetTokenHash: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Email verification fields.
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Normalize email before validation and saving.
userSchema.pre('validate', function () {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
});

const User = mongoose.model('User', userSchema);

export default User;
