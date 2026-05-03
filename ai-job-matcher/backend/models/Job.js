const mongoose = require('mongoose');

/**
 * Job Schema — Step 1 expansion
 * Designed to accommodate:
 *   - Internal jobs posted by recruiters
 *   - External jobs fetched via JobSpy (Step 6) using source field
 *   - Full semantic matching (Step 2) via rich text fields
 *   - AI skill suggestions (Step 3 form) via preferredSkills / techStack
 */
const jobSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────────
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () { return this.source === 'internal'; },
    },

    // ── Core Identity ──────────────────────────────────────────────────────
    title:       { type: String, required: true, trim: true },
    company:     { type: String, required: true, trim: true },
    industry:    { type: String, trim: true },          // e.g. "FinTech", "HealthTech"
    jobCategory: { type: String, trim: true },          // e.g. "Engineering", "Design"

    // ── Employment Details ─────────────────────────────────────────────────
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Other'],
      default: 'Full-time',
    },
    workMode: {
      type: String,
      enum: ['Remote', 'Hybrid', 'On-site'],
      default: 'On-site',
    },
    location:         { type: String, trim: true },
    timezone:         { type: String, trim: true },     // e.g. "IST", "EST"
    geoFlexibility:   { type: String, trim: true },     // e.g. "India only"

    // ── Compensation ───────────────────────────────────────────────────────
    salaryMin:    { type: Number },
    salaryMax:    { type: Number },
    // Currency: INR/USD/EUR etc.
    salaryCurrency: { type: String, default: 'INR', trim: true },
    // Unit the number is in: LPA / K / CR / Annual / Monthly
    salaryUnit: {
      type: String,
      enum: ['LPA', 'K', 'CR', 'Annual', 'Monthly'],
      default: 'LPA',
    },
    bonusInfo:    { type: String, trim: true },
    equity:       { type: String, trim: true },
    benefits:     [{ type: String, trim: true }],       // e.g. ["Health Insurance", "PTO"]

    // ── Job Content ────────────────────────────────────────────────────────
    description:     { type: String, required: true },  // full JD — used by SBERT Step 2
    responsibilities:[{ type: String, trim: true }],    // bullet list
    outcomes:        [{ type: String, trim: true }],    // 30-60-90 day goals

    // ── Skills ─────────────────────────────────────────────────────────────
    requiredSkills:  [{ type: String, trim: true }],    // must-haves (canonical)
    preferredSkills: [{ type: String, trim: true }],    // nice-to-haves
    softSkills:      [{ type: String, trim: true }],    // e.g. ["Communication", "Leadership"]
    techStack:       [{ type: String, trim: true }],    // tools/platforms e.g. ["AWS", "Jira"]

    // ── Candidate Requirements ─────────────────────────────────────────────
    experienceYears: { type: Number, default: 0 },      // minimum years
    educationLevel: {
      type: String,
      enum: ['Any', 'High School', 'Diploma', 'Bachelor\'s', 'Master\'s', 'PhD'],
      default: 'Any',
    },
    languages: [{ type: String, trim: true }],          // e.g. ["English", "Hindi"]

    // ── Hiring Process ─────────────────────────────────────────────────────
    interviewStages:  [{ type: String, trim: true }],   // e.g. ["HR Round", "Technical", "Final"]
    expectedTimeline: { type: String, trim: true },     // e.g. "2-3 weeks"
    hiringManager:    { type: String, trim: true },
    applicationInstructions: { type: String, trim: true },

    // ── Meta / Lifecycle ───────────────────────────────────────────────────
    externalJobId: { type: String, trim: true },        // for ATS sync or JobSpy ID
    postingDate:   { type: Date, default: Date.now },
    expiryDate:    { type: Date },
    isActive:      { type: Boolean, default: true },

    // ── Source: 'internal' (recruiter posted) | 'linkedin' | 'indeed' etc.
    // Planted now for Step 6 (JobSpy external aggregation)
    source: {
      type: String,
      enum: ['internal', 'linkedin', 'indeed', 'glassdoor', 'naukri', 'other'],
      default: 'internal',
    },
    // External apply URL — used by Step 6 for external jobs
    applyUrl: { type: String, trim: true },

    // ── D&I ────────────────────────────────────────────────────────────────
    diversityStatement: { type: String, trim: true },
  },
  { timestamps: true }
);

// Text index for full-text search across title, description, company
// Supports Step 6 external job search and general job listing search
jobSchema.index({ title: 'text', description: 'text', company: 'text' });

// Compound index: active internal jobs sorted by newest
jobSchema.index({ source: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
