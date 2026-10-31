const crypto = require('crypto');

const MIN_LENGTH = 10;

// bcrypt only reads the first 72 bytes, so a longer password would be
// silently cut short.
const MAX_BYTES = 72;

const BREACHED_MESSAGE =
    'That password has appeared in a known data breach. Please choose a different one.';

// Words people reach for first. A password that is one of these plus
// digits or symbols (Password123!, Zambia@2025) is rejected too.
const COMMON_STEMS = new Set([
    'password', 'passwd', 'pass', 'passcode', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl',
    'zxcvbn', 'zxcvbnm', 'abc', 'abcd', 'abcdef', 'letmein', 'welcome', 'admin', 'administrator',
    'root', 'login', 'user', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'soccer',
    'basketball', 'master', 'sunshine', 'princess', 'shadow', 'superman', 'batman', 'trustno',
    'starwars', 'whatever', 'freedom', 'secret', 'hello', 'hunter', 'charlie', 'michael',
    'jennifer', 'jordan', 'ashley', 'daniel', 'thomas', 'jesus', 'jesuschrist', 'godisgood',
    'godislove', 'blessed', 'blessing', 'praise', 'amen', 'church', 'lusaka', 'zambia', 'zambian',
    'kitwe', 'ndola', 'livingstone', 'kabwe', 'chipata', 'copperbelt', 'chipolopolo', 'krint',
    'tufwale', 'krinttufwale', 'nokusansamuka', 'shop', 'store', 'clothing', 'fashion', 'test',
    'testing', 'demo', 'guest', 'default', 'changeme', 'newpassword', 'mypassword', 'chelsea',
    'arsenal', 'liverpool', 'manutd', 'barcelona', 'realmadrid',
]);

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const KEYBOARD = 'qwertyuiopasdfghjklzxcvbnm';

// p@ssw0rd -> password (the digit 1 is left alone so "password1" still reduces to "password")
const LEET = { '@': 'a', '4': 'a', '0': 'o', '3': 'e', '$': 's', '5': 's', '7': 't', '!': 'i' };

const lettersOnly = (text) => text.replace(/[^\p{L}]/gu, '');

function isCommon(password) {
    const lower = password.toLowerCase();

    // Plain: every digit and symbol dropped (Password123!, 123password)
    const plain = lettersOnly(lower);

    // Leet: trim leading/trailing digits and symbols first, so a year like
    // "2025" is not rewritten into letters, then undo p@ssw0rd-style swaps
    const core = lower.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    const leet = lettersOnly(core.replace(/[@40$3!57]/g, (ch) => LEET[ch]));

    for (const stem of [plain, leet]) {
        if (COMMON_STEMS.has(stem)) return true;
        if (stem.length >= 4 && (ALPHABET.includes(stem) || KEYBOARD.includes(stem))) return true;
        if (stem.length > 0 && /^(.)\1+$/u.test(stem)) return true;   // aaaaaaaa1
    }
    return false;
}

function containsPersonalInfo(password, { name = '', email = '' } = {}) {
    const lower = password.toLowerCase();
    const parts = String(name).toLowerCase().split(/\s+/);
    parts.push(String(email).toLowerCase().split('@')[0]);

    return parts.some((part) => part.length >= 4 && lower.includes(part));
}

/* Returns a message for the first rule broken, or null if the password is fine. */
function checkPasswordRules(password, person = {}) {
    if (!password) return 'Password is required.';
    if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
    if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) return `Password is too long (max ${MAX_BYTES} characters).`;
    if (!/\p{L}/u.test(password)) return 'Password needs at least one letter.';
    if (!/\p{Nd}/u.test(password)) return 'Password needs at least one number.';
    if (new Set(password).size < 5) return 'Password is too repetitive. Mix it up a little.';
    if (isCommon(password)) return 'That password is too easy to guess. A longer phrase that only you would know works well.';
    if (containsPersonalInfo(password, person)) return "Password can't contain your name or email address.";
    return null;
}

/* Has this password shown up in a known data breach? Uses the Have I Been
   Pwned range API: only the first 5 characters of the password's SHA-1 hash
   leave the server, never the password. If the service is slow or down this
   answers "no", so a third party can never block sign-ups. */
async function isPasswordBreached(password, fetchImpl = fetch) {
    if (process.env.PASSWORD_BREACH_CHECK === 'off') return false;

    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
        const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: { 'Add-Padding': 'true' },
            signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) return false;

        const body = await res.text();

        // Padding rows have a count of 0 and must be ignored
        return body.split('\n').some((line) => {
            const [hash, count] = line.trim().split(':');
            return hash === suffix && Number(count) > 0;
        });
    } catch (err) {
        return false;
    }
}

module.exports = {
    MIN_LENGTH,
    MAX_BYTES,
    BREACHED_MESSAGE,
    checkPasswordRules,
    isPasswordBreached,
};