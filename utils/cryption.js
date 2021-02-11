const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const iv = crypto.randomBytes(16);

exports.encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, process.env.CYPTO_SECRET_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

exports.decrypt = (hash) => {
    const decipher = crypto.createDecipheriv(algorithm, process.env.CYPTO_SECRET_KEY, Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrpyted.toString();
};