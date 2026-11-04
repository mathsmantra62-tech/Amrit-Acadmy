// Firebase web apiKey public hoti hai, isliye yahan default rakhi hai
const FIREBASE_API_KEY = 'AIzaSyCYS72sMHW_lkTOLFbrjP6h5hMBH4XaSW0';

// Firebase ID token se user ka uid nikalta hai (firebase-admin ki zaroorat nahi)
module.exports = async function getUid(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY || FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return (d.users && d.users[0] && d.users[0].localId) || null;
  } catch (e) {
    return null;
  }
};
