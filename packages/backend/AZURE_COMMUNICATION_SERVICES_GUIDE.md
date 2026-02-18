# Azure Communication Services Integration Guide

## Overview

This guide explains how to integrate Azure Communication Services for SMS, WhatsApp, and Email notifications in the SageSure India Platform.

## Why Azure Communication Services?

### Benefits Over Third-Party Services (Twilio, SendGrid, etc.)

1. **Native Azure Ecosystem Integration**
   - Same infrastructure as AKS, PostgreSQL, Redis, Key Vault
   - Unified identity and access management (Azure AD)
   - Single pane of glass for monitoring (Application Insights)
   - Consistent security policies across all services

2. **Cost Efficiency**
   - Competitive pricing: $0.0075/SMS vs Twilio's $0.0079/SMS
   - No separate vendor contracts or billing
   - Volume discounts for Azure customers
   - No hidden fees or surprise charges

3. **Enterprise-Grade Reliability**
   - 99.9% SLA guarantee
   - Global redundancy and failover
   - Built-in DDoS protection
   - Auto-scaling with demand

4. **Compliance and Security**
   - Built-in GDPR, HIPAA, SOC 2, ISO 27001 compliance
   - Data residency options (India region available)
   - Encryption at rest and in transit
   - Integration with Azure Key Vault for secrets

5. **Developer Experience**
   - Consistent Azure SDK patterns
   - Native TypeScript/JavaScript support
   - Excellent documentation and samples
   - Azure Portal for easy management

6. **Monitoring and Observability**
   - Native Application Insights integration
   - Real-time metrics and alerts
   - Distributed tracing across services
   - Cost analysis and optimization tools

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SageSure India Platform                   │
│                                                              │
│  ┌──────────────┐      ┌─────────────────────────────────┐ │
│  │   Backend    │─────▶│  Notification Service           │ │
│  │   (AKS Pod)  │      │  (notification.service.ts)      │ │
│  └──────────────┘      └─────────────────────────────────┘ │
│                                    │                         │
└────────────────────────────────────┼─────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │  Azure Comm  │  │  Azure Comm  │  │  Azure Comm  │
         │  Services    │  │  Services    │  │  Services    │
         │  (SMS)       │  │  (Email)     │  │  (WhatsApp)  │
         └──────────────┘  └──────────────┘  └──────────────┘
                │                 │                 │
                ▼                 ▼                 ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   End User   │  │   End User   │  │   End User   │
         │   (SMS)      │  │   (Email)    │  │  (WhatsApp)  │
         └──────────────┘  └──────────────┘  └──────────────┘
```

## Setup Instructions

### Step 1: Create Azure Communication Services Resource

#### Via Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Communication Services"
4. Click "Create"
5. Fill in details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: `sagesure-rg` (or your resource group)
   - **Resource Name**: `sagesure-communication`
   - **Data Location**: `India` (for data residency)
6. Click "Review + Create"
7. Click "Create"

#### Via Azure CLI

```bash
# Login to Azure
az login

# Create Communication Services resource
az communication create \
  --name sagesure-communication \
  --resource-group sagesure-rg \
  --location global \
  --data-location India

# Get connection string
az communication list-key \
  --name sagesure-communication \
  --resource-group sagesure-rg \
  --query primaryConnectionString \
  --output tsv
```

### Step 2: Configure SMS

#### Purchase Phone Number

1. In Azure Portal, navigate to your Communication Services resource
2. Go to "Phone numbers" in the left menu
3. Click "Get" to purchase a number
4. Select:
   - **Country**: India (+91)
   - **Number type**: Toll-free or Local
   - **Capabilities**: SMS (outbound)
5. Complete purchase

#### Configure SMS in Code

```typescript
// Install SDK
npm install @azure/communication-sms

// Update notification.service.ts
import { SmsClient } from '@azure/communication-sms';

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
const smsClient = new SmsClient(connectionString);

async function sendSMS(phone: string, message: string) {
  const sendResults = await smsClient.send({
    from: process.env.AZURE_COMMUNICATION_PHONE_NUMBER,
    to: [phone],
    message: message,
  });

  const result = sendResults[0];
  if (result.successful) {
    console.log('SMS sent successfully:', result.messageId);
    return true;
  } else {
    console.error('SMS failed:', result.errorMessage);
    return false;
  }
}
```

### Step 3: Configure Email

#### Set Up Email Domain

1. In Azure Portal, navigate to your Communication Services resource
2. Go to "Email" → "Domains"
3. Option A: Use Azure-managed domain (quick start)
   - Click "Add domain"
   - Select "Azure managed domain"
   - Get free subdomain: `<your-name>.azurecomm.net`

4. Option B: Use custom domain (production)
   - Click "Add domain"
   - Select "Custom domain"
   - Enter your domain: `sagesure.in`
   - Add DNS records (TXT, CNAME) to verify ownership
   - Wait for verification (can take up to 24 hours)

#### Configure Email in Code

```typescript
// Install SDK
npm install @azure/communication-email

// Update notification.service.ts
import { EmailClient } from '@azure/communication-email';

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
const emailClient = new EmailClient(connectionString);

async function sendEmail(email: string, subject: string, message: string) {
  const emailMessage = {
    senderAddress: process.env.AZURE_COMMUNICATION_EMAIL_FROM,
    content: {
      subject: subject,
      plainText: message,
      html: `<html><body><p>${message}</p></body></html>`,
    },
    recipients: {
      to: [{ address: email }],
    },
  };

  const poller = await emailClient.beginSend(emailMessage);
  const result = await poller.pollUntilDone();

  console.log('Email sent:', result.id);
  return true;
}
```

### Step 4: Configure WhatsApp

Azure Communication Services WhatsApp support is in preview. Here are your options:

#### Option 1: Azure Service Bus + WhatsApp Business API (Recommended)

```typescript
// 1. Set up WhatsApp Business Account
// - Register at https://business.whatsapp.com
// - Verify your business
// - Get API credentials

// 2. Create Azure Service Bus for message queuing
az servicebus namespace create \
  --name sagesure-servicebus \
  --resource-group sagesure-rg \
  --location centralindia

// 3. Create queue for WhatsApp messages
az servicebus queue create \
  --name whatsapp-messages \
  --namespace-name sagesure-servicebus \
  --resource-group sagesure-rg

// 4. Implement WhatsApp sender
import { ServiceBusClient } from '@azure/service-bus';

const serviceBusClient = new ServiceBusClient(
  process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
);

async function sendWhatsApp(phone: string, message: string) {
  const sender = serviceBusClient.createSender('whatsapp-messages');
  
  await sender.sendMessages({
    body: {
      to: phone,
      message: message,
      timestamp: new Date(),
    },
  });

  await sender.close();
  
  // Separate worker process consumes from queue and sends via WhatsApp Business API
  return true;
}
```

#### Option 2: Azure Logic Apps (No-Code Solution)

1. Create Logic App in Azure Portal
2. Add trigger: "When a HTTP request is received"
3. Add action: "WhatsApp - Send message"
4. Configure WhatsApp connector with Business API credentials
5. Call Logic App from your code:

```typescript
async function sendWhatsApp(phone: string, message: string) {
  const response = await fetch(process.env.LOGIC_APP_WHATSAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  });

  return response.ok;
}
```

#### Option 3: Wait for Native Support

Azure Communication Services is adding native WhatsApp support. Monitor:
- [Azure Communication Services Roadmap](https://azure.microsoft.com/en-us/updates/?product=communication-services)
- [Azure Communication Services Blog](https://techcommunity.microsoft.com/t5/azure-communication-services/bg-p/AzureCommunicationServicesBlog)

### Step 5: Environment Configuration

Add to `.env`:

```env
# Azure Communication Services
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://sagesure-communication.communication.azure.com/;accesskey=...
AZURE_COMMUNICATION_PHONE_NUMBER=+911234567890
AZURE_COMMUNICATION_EMAIL_FROM=noreply@sagesure.in

# Optional: Azure Service Bus (for WhatsApp)
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://sagesure-servicebus.servicebus.windows.net/;SharedAccessKeyName=...

# Optional: Logic App (for WhatsApp)
LOGIC_APP_WHATSAPP_URL=https://prod-xx.centralindia.logic.azure.com:443/workflows/.../triggers/manual/paths/invoke?...
```

Add to Azure Key Vault:

```bash
# Store connection string in Key Vault
az keyvault secret set \
  --vault-name sagesure-keyvault \
  --name azure-communication-connection-string \
  --value "endpoint=https://...;accesskey=..."

# Update AKS to use Key Vault
# (Already configured in infrastructure/kubernetes/keyvault-csi.yaml)
```

### Step 6: Update Code

Uncomment the Azure Communication Services code in `notification.service.ts`:

```typescript
// Remove mock implementations
// Uncomment Azure SDK calls
// Test with real phone numbers and emails
```

## Pricing

### SMS Pricing (India)

| Volume | Price per SMS |
|--------|---------------|
| 0 - 100K | $0.0075 |
| 100K - 1M | $0.0070 |
| 1M+ | $0.0065 |

### Email Pricing

| Volume | Price per Email |
|--------|-----------------|
| 0 - 100K | $0.00025 |
| 100K+ | $0.00020 |

### WhatsApp Pricing (via Business API)

| Message Type | Price |
|--------------|-------|
| Session Message | $0.0042 |
| Template Message | $0.0084 |

**Estimated Monthly Cost (10,000 users, 5% high-risk alerts):**
- SMS: 500 alerts/day × 30 days × $0.0075 = $112.50/month
- WhatsApp: 500 alerts/day × 30 days × $0.0042 = $63/month
- Email: 500 alerts/day × 30 days × $0.00025 = $3.75/month
- **Total: ~$180/month**

Compare to Twilio: ~$200/month (11% more expensive)

## Monitoring and Alerts

### Application Insights Integration

```typescript
import { ApplicationInsights } from '@azure/monitor-opentelemetry';

// Already configured in your AKS deployment
// Automatically tracks:
// - SMS send success/failure rates
// - Email delivery rates
// - API latency
// - Error rates
```

### Set Up Alerts

```bash
# Create alert for SMS failures
az monitor metrics alert create \
  --name sms-failure-alert \
  --resource-group sagesure-rg \
  --scopes /subscriptions/.../resourceGroups/sagesure-rg/providers/Microsoft.Communication/communicationServices/sagesure-communication \
  --condition "count MessagesFailed > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action email admin@sagesure.in
```

## Testing

### Test SMS

```bash
curl -X POST http://localhost:3000/api/v1/scamshield/add-family-member \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "relationship": "friend",
    "phone": "+919876543210",
    "email": "test@example.com"
  }'

# Trigger high-risk scam alert
curl -X POST http://localhost:3000/api/v1/scamshield/analyze-message \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "URGENT: Digital arrest warrant issued. Join video call immediately."
  }'
```

### Test Email

```bash
# Send test email via Azure Portal
# Navigate to: Communication Services > Email > Send test email
```

## Troubleshooting

### Common Issues

1. **SMS not sending**
   - Check phone number format (E.164: +91XXXXXXXXXX)
   - Verify phone number is purchased and active
   - Check SMS capability is enabled on number
   - Review Application Insights for errors

2. **Email not delivering**
   - Verify domain ownership (DNS records)
   - Check sender address is verified
   - Review spam filters
   - Check recipient email is valid

3. **Connection string errors**
   - Verify connection string is correct
   - Check Key Vault access policies
   - Ensure AKS pod has managed identity permissions

4. **Rate limiting**
   - Azure Communication Services has default limits
   - Request limit increases via Azure Support
   - Implement exponential backoff

## Best Practices

1. **Use Managed Identity**: Don't store connection strings in code
2. **Implement Retry Logic**: Handle transient failures
3. **Monitor Costs**: Set up budget alerts
4. **Test Thoroughly**: Use test phone numbers before production
5. **Respect Rate Limits**: Implement queuing for high volume
6. **Log Everything**: Track all notification attempts
7. **Handle Failures Gracefully**: Don't fail main request if notification fails

## Migration from Twilio

If you're migrating from Twilio:

1. **Parallel Run**: Run both services simultaneously
2. **Gradual Rollout**: Route 10% → 50% → 100% to Azure
3. **Monitor Metrics**: Compare delivery rates and latency
4. **Update Webhooks**: Change callback URLs to Azure endpoints
5. **Migrate Phone Numbers**: Port numbers to Azure (if needed)

## Support and Resources

- [Azure Communication Services Documentation](https://docs.microsoft.com/en-us/azure/communication-services/)
- [Azure Communication Services Pricing](https://azure.microsoft.com/en-us/pricing/details/communication-services/)
- [Azure Communication Services Samples](https://github.com/Azure-Samples/communication-services-javascript-quickstarts)
- [Azure Support](https://azure.microsoft.com/en-us/support/options/)

## Conclusion

Azure Communication Services provides a native, cost-effective, and enterprise-grade solution for SMS, Email, and WhatsApp notifications. By using Azure's ecosystem, you get:

- ✅ Better integration with existing Azure infrastructure
- ✅ Lower costs and unified billing
- ✅ Enterprise SLAs and compliance
- ✅ Simplified monitoring and management
- ✅ Future-proof with Azure's roadmap

This is the recommended approach for the SageSure India Platform.
