import { render } from "@react-email/components";

import { VerificationEmail } from "./templates/verification-email";
import { sendEmail } from "./transport";

export async function sendVerificationEmail(to: string, url: string) {
  const html = await render(<VerificationEmail url={url} />);
  await sendEmail({
    to,
    subject: "Verify your email address",
    html,
  });
}
