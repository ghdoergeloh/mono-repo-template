import type { SendMailOptions, Transporter } from "nodemailer";
import { describe, expect, it } from "vitest";

import type { Email } from "./transport";
import { sendVerificationEmail } from "./emails";
import { createMailer, smtpTransportOptions } from "./transport";

const config = {
  host: "localhost",
  port: 1025,
  secure: false,
  from: "noreply@example.test",
};

describe("sendVerificationEmail", () => {
  it("sends the link to the new address", async () => {
    const sent: Email[] = [];
    const mailer = {
      send: (email: Email) => {
        sent.push(email);
        return Promise.resolve();
      },
    };
    await sendVerificationEmail(
      mailer,
      "ada@example.test",
      "https://app.example.test/verify?token=t1",
    );
    expect(sent.map((email) => email.to)).toEqual(["ada@example.test"]);
    expect(sent[0]?.html).toContain("https://app.example.test/verify?token=t1");
  });
});

describe("createMailer", () => {
  it("creates an SMTP transport without connecting", () => {
    expect(createMailer(config)).toHaveProperty("send");
  });

  it("logs in only when a user is set", () => {
    expect(smtpTransportOptions(config)).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
    });
    expect(smtpTransportOptions({ ...config, user: "u", pass: "p" })).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
      auth: { user: "u", pass: "p" },
    });
  });

  it("sends from the configured address", async () => {
    const calls: SendMailOptions[] = [];
    const transporter = {
      sendMail: (options: SendMailOptions) => {
        calls.push(options);
        return Promise.resolve({});
      },
    } as unknown as Transporter;
    await createMailer(config, transporter).send({
      to: "ada@example.test",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(calls).toEqual([
      {
        from: "noreply@example.test",
        to: "ada@example.test",
        subject: "Hi",
        html: "<p>Hi</p>",
      },
    ]);
  });
});
