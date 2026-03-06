const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String },
    description: { type: String, required: true }, // free text JD
    requiredSkills: [{ type: String }], // normalized skills (we'll refine later)
    salaryRange: { type: String },
    jobType: { type: String }, // e.g. "Full-time", "Internship"
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
