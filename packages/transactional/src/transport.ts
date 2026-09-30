import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

/** SMTP settings of the mailer. */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  /** Sender address, e.g. `noreply@example.com`. */
  from: string;
}

/** One email to send. */
export interface Email {
  to: string;
  subject: string;
  html: string;
}

/** Sends emails. Tests pass their own transporter (e.g. `jsonTransport`). */
export interface Mailer {
  send(email: Email): Promise<void>;
}

/** The nodemailer SMTP options of a config; login only with a user. */
export function smtpTransportOptions(config: SmtpConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && { auth: { user: config.user, pass: config.pass } }),
  };
}

/** Creates a mailer for an SMTP server, or for the given transporter. */
export function createMailer(
  config: SmtpConfig,
  transporter: Transporter = nodemailer.createTransport(
    smtpTransportOptions(config),
  ),
): Mailer {
  return {
    send: async (email) => {
      await transporter.sendMail({ from: config.from, ...email });
    },
  };
}
