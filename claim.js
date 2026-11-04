// POST /api/claim  { paymentId, idToken }
// Razorpay se payment verify karta hai aur use logged-in Firebase account se bind karta hai.
const redis = require('./_redis');
const getUid = require('./_auth');

// Key ID secret nahi hoti (sirf Key Secret Vercel mein rakhni hai). Live jaate waqt Vercel mein RAZORPAY_KEY_ID set karke ise badal dein.
const RAZORPAY_KEY_ID = 'rzp_test_Tvy0hN9VL6M8xo';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const { paymentId, idToken } = req.body || {};
  if (!/^pay_[A-Za-z0-9]{8,30}$/.test(paymentId || '')) {
    return res.status(400).json({ ok: false, message: 'Payment ID sahi nahi hai.' });
  }

  const uid = await getUid(idToken);
  if (!uid) return res.status(401).json({ ok: false, message: 'Pehle login karein.' });

  try {
    // 1) Razorpay se payment asli hai ya nahi, verify karo
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const rz = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!rz.ok) return res.status(404).json({ ok: false, message: 'Yeh payment Razorpay par nahi mila.' });

    const p = await rz.json();
    const minPaise = Number(process.env.PRICE_PAISE || 9900);
    if (p.status !== 'captured' || p.amount < minPaise) {
      return res.status(402).json({ ok: false, message: 'Payment poora nahi hua ya amount kam hai.' });
    }

    // 2) Ek payment = ek account
    const first = await redis.set(`pay:${paymentId}`, uid, { nx: true });
    if (first !== 'OK') {
      const owner = await redis.get(`pay:${paymentId}`);
      if (owner !== uid) {
        return res.status(403).json({ ok: false, message: 'Yeh payment kisi aur account par use ho chuka hai.' });
      }
    }
    await redis.set(`uid:${uid}`, paymentId);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Server error, thodi der baad try karein.' });
  }
};
