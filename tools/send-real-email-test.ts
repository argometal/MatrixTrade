/**
 * Send a real SMTP test email to argus@argometal.dev (multipart + attachment).
 * Usage: npx tsx tools/send-real-email-test.ts
 */
import { connect } from "net";
import { randomBytes } from "crypto";

const TO = "argus@argometal.dev";
const FROM = "argus-e2e-test@example.com";
const MX_HOSTS = ["route1.mx.cloudflare.net", "route2.mx.cloudflare.net", "route3.mx.cloudflare.net"];
const SUBJECT = `ARGUS P1 E2E ${new Date().toISOString()}`;
const BOUNDARY = `argus-e2e-${randomBytes(8).toString("hex")}`;

function buildMessage(): string {
  const date = new Date().toUTCString();
  const bodyText =
    "Real Cloudflare Email Routing E2E test for ARGUS intake P1.\n" +
    "Expected fields: subject, body, sender, receivedAt, one attachment.\n";
  const attachmentBody = "ARGUS real-email attachment body.";

  return [
    `From: ARGUS E2E Test <${FROM}>`,
    `To: ${TO}`,
    `Subject: ${SUBJECT}`,
    `Date: ${date}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${BOUNDARY}"`,
    "",
    `--${BOUNDARY}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    bodyText,
    `--${BOUNDARY}`,
    'Content-Type: text/plain; name="argus-e2e.txt"',
    "Content-Transfer-Encoding: 7bit",
    'Content-Disposition: attachment; filename="argus-e2e.txt"',
    "",
    attachmentBody,
    `--${BOUNDARY}--`,
    "",
  ].join("\r\n");
}

async function smtpDialog(host: string, message: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = connect(25, host);
    let buffer = "";
    let step = 0;
    const lines = [
      `EHLO argometal.dev\r\n`,
      `MAIL FROM:<${FROM}>\r\n`,
      `RCPT TO:<${TO}>\r\n`,
      "DATA\r\n",
      `${message}\r\n.\r\n`,
      "QUIT\r\n",
    ];

    const fail = (err: string) => {
      socket.destroy();
      reject(new Error(`${host}: ${err}`));
    };

    socket.setEncoding("utf8");
    socket.setTimeout(30000, () => fail("timeout"));

    socket.on("data", (chunk: string) => {
      buffer += chunk;
      while (buffer.includes("\n")) {
        const idx = buffer.indexOf("\n");
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        const code = Number(line.slice(0, 3));
        if (Number.isNaN(code)) continue;

        if (step === 0 && code === 220) {
          socket.write(lines[step++]);
          continue;
        }
        if (step > 0 && step < 5 && code >= 250) {
          socket.write(lines[step++]);
          continue;
        }
        if (step === 5 && code === 221) {
          socket.end();
          resolve();
          return;
        }
        if (code >= 400) {
          fail(`SMTP ${line} (step ${step})`);
        }
      }
    });

    socket.on("error", (err) => reject(err));
    socket.on("close", () => {
      if (step >= 5) resolve();
    });
  });
}

async function main(): Promise<void> {
  const message = buildMessage();
  console.log(`Sending test email to ${TO}`);
  console.log(`Subject: ${SUBJECT}`);

  let lastErr: unknown;
  for (const host of MX_HOSTS) {
    try {
      await smtpDialog(host, message);
      console.log(`Accepted by ${host}`);
      return;
    } catch (err) {
      lastErr = err;
      console.log(`Failed ${host}: ${err instanceof Error ? err.message : err}`);
    }
  }
  throw lastErr;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
