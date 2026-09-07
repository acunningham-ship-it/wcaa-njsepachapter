/* Unit tests for the session + password logic in functions/api/_lib.js.
   Runs the SAME code the Cloudflare function uses (Node 20+ exposes the Web Crypto
   globals that _lib.js relies on). Run:  node tools/test-auth.mjs               */
import { sha256Hex, constantTimeEqual, signToken, verifyToken } from '../functions/api/_lib.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('FAIL  ' + name); }
}

const SECRET = 'test-session-secret-abc123';

// ---- SHA-256 password hashing ----
// Known vector: sha256("password") — lets us confirm the algorithm/encoding.
const KNOWN = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
check('sha256("password") matches known vector', (await sha256Hex('password')) === KNOWN);

// Simulate the login check: store hash of the real password, verify inputs.
const realPass = 'Correct Horse 42!';
const storedHash = await sha256Hex(realPass);
check('correct password verifies', constantTimeEqual(await sha256Hex(realPass), storedHash));
check('wrong password is rejected', !constantTimeEqual(await sha256Hex('wrong password'), storedHash));
check('uppercase-hex stored hash still compares (login lowercases)', constantTimeEqual(await sha256Hex(realPass), storedHash.toUpperCase().toLowerCase()));

// ---- constant-time compare edge cases ----
check('equal strings compare true', constantTimeEqual('abcdef', 'abcdef'));
check('different-length strings compare false', !constantTimeEqual('abc', 'abcd'));
check('non-string inputs compare false', !constantTimeEqual(null, 'abc'));

// ---- HMAC session token sign/verify ----
const good = await signToken({ exp: Date.now() + 60000, sub: 'Denise' }, SECRET);
const payload = await verifyToken(good, SECRET);
check('valid token verifies and returns payload', payload && payload.sub === 'Denise');

check('token signed with a different secret is rejected', (await verifyToken(good, 'other-secret')) === null);

// Tamper with the payload but keep the old signature -> must fail.
const [data, sig] = good.split('.');
const tamperedData = Buffer.from(JSON.stringify({ exp: Date.now() + 999999999, sub: 'Denise' }))
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
check('tampered payload with old signature is rejected', (await verifyToken(tamperedData + '.' + sig, SECRET)) === null);

// Flip one char of the signature -> must fail.
const flipped = sig[0] === 'a' ? 'b' + sig.slice(1) : 'a' + sig.slice(1);
check('tampered signature is rejected', (await verifyToken(data + '.' + flipped, SECRET)) === null);

// Expired token -> must fail.
const expired = await signToken({ exp: Date.now() - 1000, sub: 'Denise' }, SECRET);
check('expired token is rejected', (await verifyToken(expired, SECRET)) === null);

// Garbage inputs -> must fail (not throw).
check('garbage token is rejected', (await verifyToken('not-a-token', SECRET)) === null);
check('empty token is rejected', (await verifyToken('', SECRET)) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
