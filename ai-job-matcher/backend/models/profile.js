const mongoose = require('mongoose');

const workHistorySchema = new mongoose.Schema({
  company:      { type: String },
  role:         { type: String },
  startDate:    { type: String },   // e.g. "Jan 2022"
  endDate:      { type: String },   // "Present" or date
  achievements: [{ type: String }], // bullet points
}, { _id: false });

const certificationSchema = new mongoose.Schema({
  name:   { type: String },
  issuer: { type: String },
  year:   { type: String },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // ── Identity ─────────────────────────────────────────────────
  fullName:       { type: String },
  headline:       { type: String },
  avatarUrl:      { type: String },   // Cloudinary URL
  phone:          { type: String },
  location:       { type: String },   // "Bhubaneswar, India"
  citizenship:    { type: String },

  // ── Links ─────────────────────────────────────────────────────
  linkedinUrl:    { type: String },
  portfolioUrl:   { type: String },
  githubUrl:      { type: String },

  // ── Professional ──────────────────────────────────────────────
  summary:        { type: String },
  skills:         [{ type: String }],
  tools:          [{ type: String }], // Tools & Technologies (separate from core skills)
  yearsOfExp:     { type: Number },
  currentTitle:   { type: String },
  currentCompany: { type: String },

  // ── History ───────────────────────────────────────────────────
  workHistory: [workHistorySchema],
  education: [{
    degree:    String,
    institute: String,
    year:      String,
    gpa:       String,
  }],
  certifications: [certificationSchema],
  languages:      [{ type: String }], // e.g. ["English", "Hindi"]
  projects: [{
    title:        String,
    description:  String,
    technologies: [String],
    link:         String,
  }],

  // ── Preferences ───────────────────────────────────────────────
  preferredTitles:  [{ type: String }],
  desiredSalary:    { type: String },   // e.g. "8-12 LPA"
  employmentType:   { type: String },   // Full-time / Contract / Freelance
  workMode:         { type: String },   // Remote / Hybrid / On-site
  noticePeriod:     { type: String },   // e.g. "30 days"
  willingToRelocate:{ type: Boolean, default: false },

  // ── Files ─────────────────────────────────────────────────────
  resumeUrl:        { type: String },   // Cloudinary raw PDF URL

}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);