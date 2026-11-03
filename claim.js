// POST /api/claim  { paymentId, deviceId }
// Razorpay se payment verify karta hai aur use is device se bind kar deta hai.
const redis = require('./_redis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const { paymentId, deviceId } = req.body || {};
  if (!/^pay_[A-Za-z0-9]{8,30}$/.test(paymentId || '') || !/^[A-Za-z0-9-]{16,80}$/.test(deviceId || '')) {
    return res.status(400).json({ ok: false, message: 'Payment ID sahi nahi hai.' });
  }

  try {
    // 1) Razorpay se payment asli hai ya nahi, verify karo
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const rz = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!rz.ok) return res.status(404).json({ ok: false, message: 'Yeh payment Razorpay par nahi mila.' });

    const p = await rz.json();
    const minPaise = Number(process.env.PRICE_PAISE || 9900);
    if (p.status !== 'captured' || p.amount < minPaise) {
      return res.status(402).json({ ok: false, message: 'Payment poora nahi hua ya amount kam hai.' });
    }

    // 2) Payment ko pehle device se bind karo (ek payment = ek device)
    const first = await redis.set(`pay:${paymentId}`, deviceId, { nx: true });
    if (first !== 'OK') {
      const owner = await redis.get(`pay:${paymentId}`);
      if (owner !== deviceId) {
        // Naya phone / factory reset: limited baar device badalne do
        const maxMoves = Number(process.env.MAX_DEVICE_CHANGES || 2);
        const used = Number(await redis.get(`moves:${paymentId}`)) || 0;
        if (used >= maxMoves) {
          return res.status(403).json({
            ok: false,
            message: 'Device badalne ki limit khatam ho chuki hai. Support se sampark karein.',
          });
        }
        await redis.set(`pay:${paymentId}`, deviceId);
        await redis.incr(`moves:${paymentId}`);
        if (owner) await redis.del(`dev:${owner}`);
      }
    }
    await redis.set(`dev:${deviceId}`, paymentId);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Server error, thodi der baad try karein.' });
  }
};
