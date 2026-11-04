// GET /api/status  (Header: Authorization: Bearer <Firebase ID token>)  ->  { unlocked: true/false }
const redis = require('./_redis');
const getUid = require('./_auth');

module.exports = async (req, res) => {
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  const uid = await getUid(idToken);
  if (!uid) return res.status(200).json({ unlocked: false });

  try {
    const paymentId = await redis.get(`uid:${uid}`);
    if (!paymentId) return res.status(200).json({ unlocked: false });
    const owner = await redis.get(`pay:${paymentId}`);
    return res.status(200).json({ unlocked: owner === uid });
  } catch (e) {
    return res.status(200).json({ unlocked: false });
  }
};
