import mongoose, { Schema } from 'mongoose';
import { dbFallback, JsonCollection } from '../models/db-fallback';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/labour_management';

let isMongoConnected = false;

export const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000 // Timeout fast so we fall back quickly
    });
    isMongoConnected = true;
    console.log('MongoDB Connected successfully!');
  } catch (error) {
    console.warn('MongoDB connection failed. Falling back to Local JSON database.');
    isMongoConnected = false;
  }
};

// Define Mongoose Schemas
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['employer', 'labour', 'common'], required: true },
  mobile: { type: String },
  address: { type: String },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },
  trustScore: { type: Number, default: 80 },
  // Labour specific
  skills: [{ type: String }],
  expectedWage: { type: Number },
  experience: { type: Number },
  languages: [{ type: String }],
  availability: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  certificates: [{ type: String }],
  portfolioImages: [{ type: String }],
  completedJobsCount: { type: Number, default: 0 },
  // Employer specific
  companyName: { type: String },
  businessDetails: { type: String },
  projectsCompleted: { type: Number, default: 0 },
  // Common User specific
  savedWorkers: [{ type: String }],
}, { timestamps: true });

const JobSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  employerId: { type: String, required: true },
  budget: { type: Number },
  wageType: { type: String, enum: ['daily', 'weekly', 'fixed'], default: 'daily' },
  location: {
    address: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  startDate: { type: String },
  duration: { type: String },
  workingHours: { type: Number },
  experienceRequired: { type: Number },
  workersNeeded: { type: Number, default: 1 },
  workersHired: [{ type: String }],
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'in-progress', 'completed', 'cancelled'], default: 'open' },
  images: [{ type: String }],
  genderPreference: { type: String, default: 'any' }
}, { timestamps: true });

const ApplicationSchema = new Schema({
  jobId: { type: String, required: true },
  labourId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  coverLetter: { type: String }
}, { timestamps: true });

const ChatSchema = new Schema({
  participants: [{ type: String }],
  lastMessage: { type: String },
  lastMessageAt: { type: Date }
}, { timestamps: true });

const MessageSchema = new Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  content: { type: String },
  contentType: { type: String, enum: ['text', 'image', 'video', 'voice', 'file'], default: 'text' },
  seen: { type: Boolean, default: false }
}, { timestamps: true });

const AttendanceSchema = new Schema({
  jobId: { type: String, required: true },
  labourId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: String },
  checkOut: { type: String },
  workPhoto: { type: String },
  hoursWorked: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent', 'pending'], default: 'present' }
}, { timestamps: true });

const PaymentSchema = new Schema({
  jobId: { type: String, required: true },
  employerId: { type: String, required: true },
  labourId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['upi', 'card', 'wallet', 'netbanking'], default: 'wallet' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  transactionId: { type: String, required: true },
  invoiceUrl: { type: String }
}, { timestamps: true });

const ReviewSchema = new Schema({
  jobId: { type: String },
  fromId: { type: String, required: true },
  toId: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String },
  skillsRating: { type: Number },
  behaviourRating: { type: Number },
  punctualityRating: { type: Number },
  qualityRating: { type: Number }
}, { timestamps: true });

const WalletSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  transactions: [{
    amount: { type: Number },
    type: { type: String, enum: ['deposit', 'withdrawal', 'earn', 'pay'] },
    description: { type: String },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const ComplaintSchema = new Schema({
  fromId: { type: String, required: true },
  reportedUserId: { type: String },
  jobId: { type: String },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' }
}, { timestamps: true });

const NotificationSchema = new Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String },
  seen: { type: Boolean, default: false }
}, { timestamps: true });

// Compile Mongoose models if connection works, else we wrap them
const MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);
const MongoJob = mongoose.models.Job || mongoose.model('Job', JobSchema);
const MongoApplication = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
const MongoChat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
const MongoMessage = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const MongoAttendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
const MongoPayment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const MongoReview = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
const MongoWallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
const MongoComplaint = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
const MongoNotification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// Create database wrappers that check connection status dynamically
function createModelWrapper<T>(mongoModel: any, fallbackCollection: JsonCollection<any>) {
  return {
    find: (filter?: any) => isMongoConnected ? mongoModel.find(filter).lean() : fallbackCollection.find(filter),
    findOne: (filter: any) => isMongoConnected ? mongoModel.findOne(filter).lean() : fallbackCollection.findOne(filter),
    findById: (id: string) => isMongoConnected ? mongoModel.findById(id).lean() : fallbackCollection.findById(id),
    create: (data: any) => isMongoConnected ? mongoModel.create(data).then((res: any) => res.toJSON()) : fallbackCollection.create(data),
    findByIdAndUpdate: (id: string, update: any, options?: any) => 
      isMongoConnected 
        ? mongoModel.findByIdAndUpdate(id, update, { new: true, ...options }).lean() 
        : fallbackCollection.findByIdAndUpdate(id, update, options),
    findByIdAndDelete: (id: string) => isMongoConnected ? mongoModel.findByIdAndDelete(id).lean() : fallbackCollection.findByIdAndDelete(id),
    deleteMany: (filter?: any) => isMongoConnected ? mongoModel.deleteMany(filter) : fallbackCollection.deleteMany(filter),
    // Extra functions to handle raw access if needed
    getRawModel: () => mongoModel,
    isMongo: () => isMongoConnected
  };
}

export const db = {
  users: createModelWrapper(MongoUser, dbFallback.users),
  jobs: createModelWrapper(MongoJob, dbFallback.jobs),
  applications: createModelWrapper(MongoApplication, dbFallback.applications),
  chats: createModelWrapper(MongoChat, dbFallback.chats),
  messages: createModelWrapper(MongoMessage, dbFallback.messages),
  attendance: createModelWrapper(MongoAttendance, dbFallback.attendance),
  payments: createModelWrapper(MongoPayment, dbFallback.payments),
  reviews: createModelWrapper(MongoReview, dbFallback.reviews),
  wallets: createModelWrapper(MongoWallet, dbFallback.wallets),
  complaints: createModelWrapper(MongoComplaint, dbFallback.complaints),
  notifications: createModelWrapper(MongoNotification, dbFallback.notifications)
};
