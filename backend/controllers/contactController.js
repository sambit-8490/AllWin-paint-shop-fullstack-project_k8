const Complaint = require('../models/Complaint');

// TESTING MODE: SMTP/nodemailer removed.
// Instead of emailing, we just log the submission and (for complaints) save it to the DB.
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message, type } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    const normalizedType = type === 'complaint' ? 'complaint' : 'general';

    // TEST MODE: log instead of sending an email
    console.log('--- New contact submission (test mode, no email sent) ---');
    console.log(`Type: ${normalizedType}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Phone: ${phone || '-'}`);
    console.log(`Subject: ${subject || '-'}`);
    console.log(`Message: ${message}`);
    console.log('-----------------------------------------------------------');

    let complaintRecord;
    if (normalizedType === 'complaint') {
      complaintRecord = await Complaint.create({
        name,
        email,
        phone,
        subject,
        message,
        type: normalizedType
      });
    }

    return res.status(200).json({
      success: true,
      data: complaintRecord || null,
      message: normalizedType === 'complaint' ? 'Complaint registered successfully' : 'Message sent successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
