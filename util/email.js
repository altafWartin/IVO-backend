const nodemailer = require("nodemailer");
const EMAIL_FORMAIL = "altaf@wartinlabs.com";
// const EMAIL_FORMAIL = "info@legacyx.uk";
// const EMAILPASSWORD_FORMAIL = "Legacy-140399";
const EMAILPASSWORD_FORMAIL = "Mac@air1";
const transport = nodemailer.createTransport({
  // host: "smtpout.secureserver.net",
  host: "live.smtp.mailtrap.io",
  port: 587,
  // secure: true,
  auth: {
    user: EMAIL_FORMAIL,
    pass: EMAILPASSWORD_FORMAIL,
  },
});

const sendMail = async (
  to,
  subject,
  text,
  from ="altaf@wartinlabs.com" // Use your email address as the default 'from' address
) => {
  try {
    let verified = await transport.verify();

    if (verified) {
      let mailOptions = {
        from,
        to,
        subject,
        text,
      };

      return transport.sendMail(mailOptions);
    }
  } catch (e) {
    console.log("Error Message :: ", e);
  }
};

module.exports = { sendMail };
