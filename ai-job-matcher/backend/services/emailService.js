const nodemailer = require('nodemailer');

// Create transporter — reads from .env
// Supports Gmail (use App Password), or any SMTP provider
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',   // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"SkillBridge" <${process.env.SMTP_USER}>`;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// ── Seeker applied → notify recruiter ─────────────────────────────────────
async function notifyRecruiterNewApplication({ recruiterEmail, recruiterName, seekerName, seekerEmail, jobTitle, applicationId }) {
  const subject = `New Application: ${seekerName} applied for "${jobTitle}"`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:auto;color:#1a1a1a">
      <div style="background:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#6366f1;margin:0">SkillBridge</h2>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
        <h3 style="margin-top:0">New Application Received 📥</h3>
        <p>Hi ${recruiterName},</p>
        <p><strong>${seekerName}</strong> (${seekerEmail}) has applied for your job posting:</p>
        <div style="background:#eef2ff;border-left:4px solid #6366f1;padding:12px 16px;border-radius:4px;margin:16px 0">
          <strong>${jobTitle}</strong>
        </div>
        <a href="${APP_URL}/recruiter/jobs" 
           style="display:inline-block;padding:10px 24px;background:#6366f1;color:white;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
          View Applications →
        </a>
        <p style="color:#64748b;font-size:0.85rem;margin-top:24px">You're receiving this because you're a recruiter on SkillBridge.</p>
      </div>
    </div>
  `;
  await transporter.sendMail({ from: FROM, to: recruiterEmail, subject, html });
}

// ── Status changed → notify seeker ────────────────────────────────────────
async function notifySeekerStatusChange({ seekerEmail, seekerName, jobTitle, company, status, recruiterNote }) {
  const statusLabels = {
    reviewed:    { emoji: '👀', label: 'Under Review',  color: '#f59e0b' },
    shortlisted: { emoji: '🎉', label: 'Shortlisted!',  color: '#10b981' },
    rejected:    { emoji: '😔', label: 'Not Selected',  color: '#f87171' },
    pending:     { emoji: '📋', label: 'Pending',        color: '#6366f1' },
  };
  const s = statusLabels[status] || statusLabels.pending;
  const subject = `${s.emoji} Application Update: ${jobTitle} at ${company}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:580px;margin:auto;color:#1a1a1a">
      <div style="background:#0f172a;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#6366f1;margin:0">SkillBridge</h2>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
        <h3 style="margin-top:0">Application Status Update</h3>
        <p>Hi ${seekerName},</p>
        <p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been updated:</p>
        <div style="background:${s.color}1a;border-left:4px solid ${s.color};padding:12px 16px;border-radius:4px;margin:16px 0">
          <strong style="color:${s.color}">${s.emoji} ${s.label}</strong>
        </div>
        ${recruiterNote ? `<p style="color:#475569"><em>Note from recruiter:</em> "${recruiterNote}"</p>` : ''}
        <a href="${APP_URL}/matches" 
           style="display:inline-block;padding:10px 24px;background:#6366f1;color:white;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
          View My Applications →
        </a>
        <p style="color:#64748b;font-size:0.85rem;margin-top:24px">You're receiving this because you applied for a job on SkillBridge.</p>
      </div>
    </div>
  `;
  await transporter.sendMail({ from: FROM, to: seekerEmail, subject, html });
}

module.exports = { notifyRecruiterNewApplication, notifySeekerStatusChange };
