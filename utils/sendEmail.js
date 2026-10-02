const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Extract the reset URL from the plain-text message
  const resetUrlMatch = text.match(/https?:\/\/[^\s]+\/reset-password\/[^\s]+/);

  const resetUrl = resetUrlMatch ? resetUrlMatch[0] : "#";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset - Nihongomax</title>
</head>

<body style="
  margin: 0;
  padding: 0;
  background-color: #f5f7fb;
  font-family: Arial, Helvetica, sans-serif;
  color: #222222;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color: #f5f7fb; padding: 40px 15px;"
  >
    <tr>
      <td align="center">

        <!-- Main Card -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 560px;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e6e8ec;
          "
        >

          <!-- Header -->
          <tr>
            <td
              align="center"
              style="
                padding: 28px 30px;
                background-color: #111827;
              "
            >
              <div style="
                font-size: 26px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 0.3px;
              ">
                nihongomax.com
              </div>

              <div style="
                margin-top: 6px;
                font-size: 13px;
                color: #d1d5db;
              ">
                Learn Japanese the best way.
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 35px 35px 35px;">

              <h1 style="
                margin: 0 0 18px 0;
                font-size: 26px;
                line-height: 1.3;
                color: #111827;
                text-align: center;
              ">
                Reset Your Password
              </h1>

              <p style="
                margin: 0 0 18px 0;
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
              ">
                We received a request to reset the password for your
                nihongomax.com account.
              </p>

              <p style="
                margin: 0 0 28px 0;
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
              ">
                Click the button below to create a new password.
              </p>

              <!-- Button -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>
                  <td align="center">

                    <a
                      href="${resetUrl}"
                      style="
                        display: inline-block;
                        padding: 14px 30px;
                        background-color: #2563eb;
                        color: #ffffff;
                        text-decoration: none;
                        font-size: 16px;
                        font-weight: 600;
                        border-radius: 7px;
                      "
                    >
                      Reset Password
                    </a>

                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <div style="
                margin-top: 30px;
                padding: 14px 16px;
                background-color: #f3f4f6;
                border-radius: 7px;
                font-size: 14px;
                line-height: 1.5;
                color: #4b5563;
              ">
                <strong>Important:</strong>
                This password reset link will expire in
                <strong>10 minutes</strong>.
              </div>

              <!-- Security Notice -->
              <p style="
                margin: 28px 0 0 0;
                font-size: 14px;
                line-height: 1.6;
                color: #6b7280;
              ">
                If you did not request a password reset, you can safely
                ignore this email. Your password will remain unchanged.
              </p>

              <!-- Fallback URL -->
              <p style="
                margin: 25px 0 0 0;
                font-size: 13px;
                line-height: 1.6;
                color: #9ca3af;
              ">
                If the button above doesn't work, Click this link
                to reset your password:
              </p>

              <p style="
                margin: 8px 0 0 0;
                font-size: 12px;
                line-height: 1.5;
                word-break: break-all;
              ">
                <a
                  href="${resetUrl}"
                  style="
                    color: #2563eb;
                    text-decoration: none;
                  "
                >
                  ${resetUrl}
                </a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                padding: 22px 25px;
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
              "
            >
              <div style="
                font-size: 13px;
                color: #6b7280;
              ">
                © ${new Date().getFullYear()} NihongoMax
              </div>

              <div style="
                margin-top: 5px;
                font-size: 12px;
                color: #9ca3af;
              ">
                Learn Japanese Online
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

  await transporter.sendMail({
    from: `"NihongoMax" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;
