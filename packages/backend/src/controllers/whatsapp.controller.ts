/**
 * WhatsApp Webhook Controller
 * Handles Twilio WhatsApp webhook requests
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { Request, Response, NextFunction } from 'express';
import { whatsappService, IncomingWhatsAppMessage } from '../services/whatsapp.service';
import { logger } from '../utils/logger';

export class WhatsAppController {
  /**
   * POST /api/v1/scamshield/whatsapp-webhook
   * Twilio WhatsApp webhook endpoint
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { From, Body, MediaUrl0, MediaContentType0, ProfileName, MessageSid } = req.body;

      if (!From || !Body) {
        res.status(400).json({ success: false, error: 'Missing required fields: From, Body' });
        return;
      }

      const message: IncomingWhatsAppMessage = {
        from: From,
        body: Body,
        mediaUrl: MediaUrl0,
        mediaContentType: MediaContentType0,
        profileName: ProfileName,
        messageSid: MessageSid || `msg-${Date.now()}`,
      };

      const response = await whatsappService.handleIncomingMessage(message);

      // Return TwiML response for Twilio
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(response.body)}</Message></Response>`;

      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml);
    } catch (error) {
      logger.error('WhatsApp webhook error', { error });
      next(error);
    }
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const whatsappController = new WhatsAppController();
