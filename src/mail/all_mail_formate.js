import nodemailer from "nodemailer";

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

export const sendOTPEmail = async (email, otp, firstName) => {
  if (!isEmailConfigured()) {
    console.log("📧 Email not configured. OTP:", otp);
    return { success: false, message: "Email not configured" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Verify connection (helps debug)
  try {
    await transporter.verify();
  } catch (verifyErr) {
    console.error("❌ SMTP verify failed:", verifyErr.message);
    throw verifyErr;
  }

  const mailOptions = {
    from: `"Cloth Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hello ${firstName || "User"},</p>
        <p>Your OTP is:</p>
        <div style="background: #fff; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4CAF50; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p style="color: #666;">Valid for 10 minutes.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email} (id: ${info.messageId})`);
    return { success: true, message: "OTP sent" };
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    throw err;   // 🔥 let controller know
  }
};