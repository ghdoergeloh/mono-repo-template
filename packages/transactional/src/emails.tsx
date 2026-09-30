// Pins the JSX runtime. Tools such as tsx may compile this file with the
// tsconfig of the importing app, which can have other JSX settings.
/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { render } from "react-email";

import type { Mailer } from "./transport";
import { VerificationEmail } from "./templates/verification-email";

/** Sends the link that verifies the email address of a new account. */
export async function sendVerificationEmail(
  mailer: Mailer,
  to: string,
  url: string,
) {
  const html = await render(<VerificationEmail url={url} />);
  await mailer.send({ to, subject: "Verify your email address", html });
}
