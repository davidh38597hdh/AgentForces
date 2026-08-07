import nodemailer from 'nodemailer';
import type { ConnectorAdapter } from './types';

export const gmailSmtpAdapter: ConnectorAdapter = {
  type: 'gmail_smtp',

  getTools(connector) {
    const suffix = connector.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const from = connector.config.email || 'configured Gmail';
    return [
      {
        toolName: `gmail_send_${suffix}`,
        connectorId: connector.id,
        description: `Send an email via Gmail connector "${connector.name}" (from ${from}). Use when the task needs email delivery. Send only — no inbox read.`,
        parameters: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Plain-text email body' },
            cc: { type: 'string', description: 'Optional CC address' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    ];
  },

  async execute(connector, _action, args) {
    const user = (connector.config.email || '').trim();
    const pass = (connector.config.appPassword || '').replace(/\s+/g, '');
    if (!user || !pass) {
      return { ok: false, detail: 'Gmail email and app password required' };
    }
    const to = String(args.to || '').trim();
    const subject = String(args.subject || '').trim();
    const body = String(args.body || '').trim();
    if (!to || !subject || !body) {
      return { ok: false, detail: 'to, subject, and body are required' };
    }
    // basic email shape
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return { ok: false, detail: 'Invalid recipient email' };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
      });
      const from = (connector.config.from || user).trim();
      const info = await transporter.sendMail({
        from,
        to,
        cc: args.cc ? String(args.cc) : undefined,
        subject: subject.slice(0, 200),
        text: body.slice(0, 20000),
      });
      return {
        ok: true,
        detail: `Email sent to ${to}${info.messageId ? ` (${info.messageId})` : ''}`,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gmail send failed';
      return {
        ok: false,
        detail: msg.replace(pass, '[redacted]').slice(0, 300),
      };
    }
  },

  async notifyComplete(connector, payload) {
    const to = (connector.config.notifyTo || connector.config.email || '').trim();
    if (!to) return { ok: false, detail: 'No notify recipient for Gmail connector' };
    return this.execute(connector, 'send', {
      to,
      subject: `AgentForces mesh complete: ${payload.task.slice(0, 80)}`,
      body: `Task:\n${payload.task}\n\nOutcome:\n${payload.outcome.slice(0, 15000)}`,
    });
  },
};
