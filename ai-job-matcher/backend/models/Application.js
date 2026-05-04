const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Status pipeline — MUST match applicationController allowed list
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired', 'withdrawn'],
      default: 'pending',
    },
    // Optional cover note from seeker
    coverNote: {
      type: String,
      default: '',
    },
    // Recruiter can add internal notes
    recruiterNote: {
      type: String,
      default: '',
    },
    // Match score at time of application (snapshot, re-computed by matchController)
    matchScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One seeker can apply to a job only once
applicationSchema.index({ job: 1, seeker: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
