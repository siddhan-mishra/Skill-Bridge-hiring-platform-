const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    headline: { type: String }, // e.g., "MERN + NLP fresher"
    summary: { type: String },
    skills: [{ type: String }], // normalized skill tags
    education: [
      {
        degree: String,
        institute: String,
        year: String,
      },
    ],
    projects: [
      {
        title: String,
        description: String,
        technologies: [String],
        link: String,
      },
    ],
    resumeUrl: { type: String }, // later when you upload to S3/Cloudinary
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
