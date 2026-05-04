const mongoose = require('mongoose');

const workHistorySchema = new mongoose.Schema({
  company:      { type: String },
  role:         { type: String },
  startDate:    { type: String },
  endDate:      { type: String },
  achievements: [{ type: String }],
}, { _id: false });

const certificationSchema = new mongoose.Schema({
  name:   { type: String },
  issuer: { type: String },
  year:   { type: String },
  link:   { type: String },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // ── Identity
  fullName:       { type: String },
  headline:       { type: String },
  avatarUrl:      { type: String },
  phone:          { type: String },
  location:       { type: String },
  citizenship:    { type: String },

  // ── Links
  linkedinUrl:    { type: String },
  portfolioUrl:   { type: String },
  githubUrl:      { type: String },

  // ── Professional
  summary:        { type: String },
  skills:         [{ type: String }],
  techStack:      [{ type: String }],   // FIX: was missing — used by matchController + resumeController
  softSkills:     [{ type: String }],   // FIX: was missing — used by matchController + resumeController
  tools:          [{ type: String }],
  yearsOfExp:     { type: Number },
  currentTitle:   { type: String },
  currentCompany: { type: String },

  // ── History
  workHistory: [workHistorySchema],
  education: [{
    degree:    String,
    institute: String,
    year:      String,
    gpa:       String,
  }],
  certifications: [certificationSchema],
  languages:      [{ type: String }],
  projects: [{
    title:        String,
    description:  String,
    technologies: [String],
    link:         String,
  }],

  // ── Preferences
  preferredTitles:   [{ type: String }],
  desiredSalary:     { type: String },
  employmentType:    { type: String },
  workMode:          { type: String },
  noticePeriod:      { type: String },
  willingToRelocate: { type: Boolean, default: false },

  // ── Files
  resumeUrl: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
