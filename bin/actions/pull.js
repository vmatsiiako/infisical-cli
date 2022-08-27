const {
	read,
	write
} = require('../utilities/file');
const {
	getFile,
	getSecrets
} = require('../api');
const {
	getCredentials
} = require('../utilities/auth');
const {
	decryptAssymmetric,
	decryptSymmetric
} = require('../utilities/crypto');
const {
	KEYS_HOST
} = require('../variables');

const fs = require('fs');

/**
 * Pull .env file from server to local. Follow steps:
 * 1. Get (encrypted) .env file and (assymetrically-encrypted) symmetric key
 * 2. Assymmetrically decrypt key with local private key
 * 3. Symmetrically decrypt .env file with key
*/
const pull = async () => {
	try {
		// read required local info
		const workspaceId = read(".env.infisical");
		const credentials = getCredentials({ host: KEYS_HOST });
		console.log('Pulling file...');
		const file = await getFile({ workspaceId });
		
		console.log('Decrypting file...');
		// assymmetrically decrypt symmetric key with local private key
		const key = decryptAssymmetric({
			ciphertext: file.key.encryptedKey,
			nonce: file.key.nonce,
			publicKey: file.key.sender.publicKey,
			privateKey: credentials.password
		});
		
		// decrypt .env file with symmetric key
		const plaintext = decryptSymmetric({
			ciphertext: file.latestFile.ciphertext,
			iv: file.latestFile.iv,
			tag: file.latestFile.tag,
			key
		});

		// overwrite existing .env file with new .env file
		write({
			fileName: '.env',
			content: plaintext
		});
		
	} catch (err) {
		console.error('❌ Error: Failed to pull .env file');
		process.exit(1);
	}
	
	console.log('✅ Successfully pulled latest .env file');
	process.exit(0);
}

/* 
 * Pull secrets from server to local. Follow steps:
 * 1. Get (encrypted) sectets and asymmetrically encrypted) symmetric key
 * 2. Asymmetrically decrypt key with local private key
 * 3. Symmetrically decrypt secrets with key
 */
const pull2 = async () => {
	try {
		// read required local info
		const workspaceId = read(".env.infisical");
		const credentials = getCredentials({ host: KEYS_HOST });
		console.log('Pulling file...');
		console.log(workspaceId);

		const secrets = await getSecrets({ workspaceId });
		
		console.log('Decrypting file...');

		// asymmetrically decrypt symmetric key with local private key
		const key = decryptAssymmetric({
			ciphertext: secrets.key.encryptedKey,
			nonce: secrets.key.nonce,
			publicKey: secrets.key.sender.publicKey,
			privateKey: credentials.password
		});
		
		// decrypt secrets with symmetric key
		let content = '';
		secrets.secrets.forEach((sp, idx) => {
			const secretKey = decryptSymmetric({
				ciphertext: sp.secretKey.ciphertext,
				iv: sp.secretKey.iv,
				tag: sp.secretKey.tag,
				key
			});
			const secretValue = decryptSymmetric({
				ciphertext: sp.secretValue.ciphertext,
				iv: sp.secretValue.iv,
				tag: sp.secretValue.tag,
				key
			});
			
			line += secretKey;
			line += '=';
			line += secretValue;
			
			if (idx > 0 && idx < secrets.secrets.length) {
				line += '\n';
			}
		});
		
		write({
			fileName: '.env',
			content
		});
	} catch (err) {
		console.error('❌ Error: Failed to pull .env file');
		process.exit(1);
	}
	
	console.log('✅ Successfully pulled latest .env file');
	process.exit(0);
}

module.exports = {
	pull,
	pull2
};
