/**
 * Generate RSA key pair for JWT testing
 * This script generates test keys for local development only
 * In production, keys should be stored in Azure Key Vault
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save keys to .env.test file
const envTestPath = path.join(__dirname, '..', '.env.test');
const envContent = `# Test JWT Keys - DO NOT USE IN PRODUCTION
JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"
JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"
`;

fs.writeFileSync(envTestPath, envContent);

console.log('✅ Test JWT keys generated successfully!');
console.log(`📁 Keys saved to: ${envTestPath}`);
console.log('\n⚠️  WARNING: These keys are for testing only!');
console.log('   In production, use Azure Key Vault for key management.');
