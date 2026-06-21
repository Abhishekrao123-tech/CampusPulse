const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create Transporter
let transporter;
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;

if (smtpHost && smtpUser) {
  transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
  transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP VERIFY ERROR:", err);
  } else {
    console.log("✅ SMTP READY");
  }
});
  console.log('✉️ SMTP Mail Transport Initialized');
} else {
  console.log('⚠️ SMTP host/credentials not provided. Email notifications will fall back to logging in the console.');
}

const sendMail = async (options) => {
  const mailOptions = {
    from: process.env.FROM_EMAIL || 'noreply@campuspulse.edu',
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments || []
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✉️ Email successfully sent to ${options.to}: ${options.subject}`);
    } catch (err) {
      console.error(`❌ Error sending email to ${options.to}:`, err.message);
    }
  } else {
    console.log(`\n======================================================
📧 [MOCK EMAIL SENT]
To: ${options.to}
Subject: ${options.subject}
Content:
${options.html.replace(/<[^>]*>/g, '\n')}
======================================================\n`);
  }
};

// 1. Send Registration Confirmation & Ticket with QR code
exports.sendRegistrationEmail = async (userEmail, userName, eventTitle, ticketCode, qrCodeDataUrl) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0a0a0f; color: #f1f0f5;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #a855f7; padding-bottom: 10px;">⚡ CampusPulse Ticket</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>You have successfully registered for <strong>${eventTitle}</strong>!</p>
      <div style="background-color: #12121a; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #1a1a2e; margin: 20px 0;">
        <p style="font-size: 1.1rem; margin-top: 0; color: #c084fc;">Your Admission Ticket</p>
        <p style="font-size: 1.3rem; font-weight: bold; letter-spacing: 2px; color: #22c55e;">CODE: ${ticketCode}</p>
        ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Ticket" style="width: 150px; height: 150px; background-color: #fff; padding: 10px; border-radius: 6px;" />` : ''}
      </div>
      <p style="color: #9891b0; font-size: 0.85rem;">Please present this code/QR code at the venue for check-in and attendance marking. Enjoy the event!</p>
      <hr style="border: none; border-top: 1px solid #1a1a2e; margin: 20px 0;" />
      <p style="text-align: center; font-size: 0.8rem; color: #5c5478;">CampusPulse Event Management System</p>
    </div>
  `;

  // Attach QR code image if it exists
  const attachments = [];
  let html = htmlContent;
  
  if (qrCodeDataUrl && qrCodeDataUrl.startsWith('data:image/png;base64,')) {
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    attachments.push({
      filename: 'ticket-qr.png',
      content: Buffer.from(base64Data, 'base64'),
      cid: 'ticketqr'
    });
    // Replace src with CID reference so it embeds in standard email clients
    html = htmlContent.replace(/src="data:image\/png;base64,[^"]+"/, 'src="cid:ticketqr"');
  }

  await sendMail({
    to: userEmail,
    subject: `Registered: ${eventTitle} — CampusPulse`,
    html: html,
    attachments
  });
};

// 2. Send Event Updates Email
exports.sendEventUpdateEmail = async (userEmail, userName, eventTitle, updates) => {
  const updateList = Object.entries(updates)
    .map(([key, val]) => `<li><strong>${key}:</strong> ${val}</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0a0a0f; color: #f1f0f5;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #a855f7; padding-bottom: 10px;">⚡ CampusPulse Event Update</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We wanted to let you know that the event <strong>${eventTitle}</strong> you registered for has been updated:</p>
      <ul style="background-color: #12121a; padding: 15px 30px; border-radius: 6px; border: 1px solid #1a1a2e; color: #c084fc;">
        ${updateList}
      </ul>
      <p>Please log in to your dashboard to view the updated details.</p>
      <hr style="border: none; border-top: 1px solid #1a1a2e; margin: 20px 0;" />
      <p style="text-align: center; font-size: 0.8rem; color: #5c5478;">CampusPulse Event Management System</p>
    </div>
  `;

  await sendMail({
    to: userEmail,
    subject: `Update: Changes to ${eventTitle} — CampusPulse`,
    html
  });
};

// 3. Send Event Cancellation Email
exports.sendEventCancellationEmail = async (userEmail, userName, eventTitle) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0a0a0f; color: #f1f0f5;">
      <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">⚠️ Event Cancelled</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We regret to inform you that the event <strong>${eventTitle}</strong> has been cancelled by the administrator or organizer.</p>
      <p>Your registration is cancelled. If there are any associated refunds or alternative events scheduled, you will be notified soon.</p>
      <hr style="border: none; border-top: 1px solid #1a1a2e; margin: 20px 0;" />
      <p style="text-align: center; font-size: 0.8rem; color: #5c5478;">CampusPulse Event Management System</p>
    </div>
  `;

  await sendMail({
    to: userEmail,
    subject: `Cancelled: ${eventTitle} has been cancelled`,
    html
  });
};

// 4. Send Forgot Password Reset Email
exports.sendResetPasswordEmail = async (userEmail, userName, resetLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #0a0a0f; color: #f1f0f5;">
      <h2 style="color: #a855f7; border-bottom: 2px solid #a855f7; padding-bottom: 10px;">⚡ Reset Your CampusPulse Password</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>You requested a password reset. Click the button below to set a new password. This reset link is valid for 1 hour.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #a855f7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 10px rgba(168,85,247,0.3);">Reset Password</a>
      </div>
      <p style="color: #9891b0; font-size: 0.85rem;">If you did not request this, please ignore this email; your password will remain unchanged.</p>
      <p style="color: #5c5478; font-size: 0.8rem; margin-top: 15px;">Or copy and paste this link in your browser: <br/> ${resetLink}</p>
      <hr style="border: none; border-top: 1px solid #1a1a2e; margin: 20px 0;" />
      <p style="text-align: center; font-size: 0.8rem; color: #5c5478;">CampusPulse Event Management System</p>
    </div>
  `;

  await sendMail({
    to: userEmail,
    subject: `Password Reset Request — CampusPulse`,
    html
  });
};
