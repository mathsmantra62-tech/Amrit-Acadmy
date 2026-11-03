// GET /api/status?deviceId=...  ->  { unlocked: true/false }
const redis = require('./_redis');

module.exports = async (req, res) => {
  const deviceId = String(req.query.deviceId || '');
  if (!/^[A-Za-z0-9-]{16,80}$/.test(deviceId)) return res.status(200).json({ unlocked: false });

  try {
    const paymentId = await redis.get(`dev:${deviceId}`);
    if (!paymentId) return res.status(200).json({ unlocked: false });
    const owner = await redis.get(`pay:${paymentId}`);
    return res.status(200).json({ unlocked: owner === deviceId });
  } catch (e) {
    return res.status(200).json({ unlocked: false });
  }
};
