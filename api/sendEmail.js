import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, subject, results } = req.body;

    // configure transporter (Gmail example)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS, // app password, not your main Gmail password
      },
    });

    const html = `
      <h2>Screening Results</h2>
      <ul>
        ${results.map(r => `
          <li>
            <b>${r.name}</b> - Score: ${r.score}<br/>
            Email: ${r.email} | Phone: ${r.phone}<br/>
            Reason: ${r.justification}
          </li>
        `).join("")}
      </ul>
    `;

    await transporter.sendMail({
      from: `"Talent Sift" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    res.status(500).json({ error: "Email send failed" });
  }
}
