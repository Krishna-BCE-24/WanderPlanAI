import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    // User who owns this trip
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Trip details
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },

    origin: {
      type: String,
      required: [true, 'Starting location is required'],
      trim: true,
      maxlength: 120,
    },

    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      maxlength: 200,
    },

    // Travel dates
    startDate: {
      type: Date,
      required: [true, 'Departure date is required'],
    },

    endDate: {
      type: Date,
      required: [true, 'Return date is required'],
    },

    // Number of travellers
    travellers: {
      adults: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        default: 2,
      },

      children: {
        type: Number,
        min: 0,
        max: 6,
        default: 0,
      },
    },

    // Budget in Indian Rupees
    budget: {
      type: Number,
      required: [true, 'Trip budget is required'],
      min: 1,
      max: 100000000,
    },

    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR',
    },

    // Travel preferences
    travelStyle: {
      type: String,
      enum: ['budget', 'balanced', 'comfort'],
      default: 'balanced',
    },

    transport: {
      type: String,
      enum: ['flight', 'train', 'bus', 'car', 'flexible'],
      default: 'flexible',
    },

    interests: {
      type: [
        {
          type: String,
          enum: [
            'Nature',
            'Adventure',
            'Mountains',
            'Beaches',
            'Culture',
            'Food',
            'History',
            'Shopping',
          ],
        },
      ],
      default: ['Nature'],
    },

    // Trip lifecycle
    status: {
      type: String,
      enum: ['draft', 'planned', 'completed', 'cancelled'],
      default: 'draft',
    },

    // Day-wise AI-generated itinerary
    itinerary: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // AI-estimated total trip cost (INR)
    estimatedCost: {
      type: Number,
      min: 0,
      default: null,
    },

    // Manually recorded expenses for this trip
    expenses: {
      type: [
        {
          // Expense name
          title: {
            type: String,
            required: [true, 'Expense title is required'],
            trim: true,
            maxlength: 100,
          },

          // Actual amount spent (INR)
          amount: {
            type: Number,
            required: [true, 'Expense amount is required'],
            min: 0.01,
            max: 100000000,
          },

          // Expense category
          category: {
            type: String,
            required: [true, 'Expense category is required'],
            enum: [
              'Food',
              'Hotel',
              'Transport',
              'Activities',
              'Shopping',
              'Miscellaneous',
            ],
          },

          // Date when money was spent
          date: {
            type: Date,
            required: [true, 'Expense date is required'],
          },

          // Optional notes
          notes: {
            type: String,
            trim: true,
            maxlength: 300,
            default: '',
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Validate dates and generate a default title
tripSchema.pre('validate', function () {
  if (this.origin) {
    this.origin = this.origin.trim();
  }

  if (this.destination) {
    this.destination = this.destination.trim();
  }

  if (!this.title && this.destination) {
    this.title = `${this.destination} Trip`;
  }

  if (
    this.startDate &&
    this.endDate &&
    this.endDate < this.startDate
  ) {
    this.invalidate(
      'endDate',
      'Return date cannot be before departure date'
    );
  }
});

// Create and export the Trip model
const Trip = mongoose.model('Trip', tripSchema);

export default Trip;
