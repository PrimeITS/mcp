import crypto from "node:crypto";

/**
 * NanoKVM uses this passphrase for client-side password encryption. It is not
 * a secret — the NanoKVM web UI ships the same constant. Encryption only
 * avoids shipping plaintext credentials over the wire.
 */
const PASSPHRASE = "nanokvm-sipeed-2024";

/**
 * OpenSSL EVP_BytesToKey (MD5). Matches CryptoJS's default passphrase-based
 * key derivation so the ciphertext is decryptable by the NanoKVM server
 * (which uses the Go `aes-everywhere` port of the same scheme).
 */
function evpBytesToKey(password: Buffer, salt: Buffer, keyLen = 32, ivLen = 16) {
  const chunks: Buffer[] = [];
  let block: Buffer = Buffer.alloc(0);
  let total = 0;
  while (total < keyLen + ivLen) {
    block = crypto
      .createHash("md5")
      .update(Buffer.concat([block, password, salt]))
      .digest() as Buffer;
    chunks.push(block);
    total += block.length;
  }
  const derived = Buffer.concat(chunks);
  return {
    key: derived.subarray(0, keyLen),
    iv: derived.subarray(keyLen, keyLen + ivLen),
  };
}

/**
 * Encrypt a plaintext value the same way the NanoKVM web UI does: AES-256-CBC
 * with a random 8-byte salt, OpenSSL "Salted__" framing, base64 + URL encoded.
 */
export function encryptForNanoKvm(plaintext: string): string {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(Buffer.from(PASSPHRASE, "utf8"), salt);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const openssl = Buffer.concat([
    Buffer.from("Salted__", "utf8"),
    salt,
    ciphertext,
  ]);
  return encodeURIComponent(openssl.toString("base64"));
}
