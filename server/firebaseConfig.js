const admin = require("firebase-admin");

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_ADMIN_SDK; // <-- нова змінна

  if (!raw) {
    throw new Error("FIREBASE_ADMIN_SDK не встановлено в env");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error("FIREBASE_ADMIN_SDK має бути валідним JSON (одним значенням env)");
  }

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
module.exports = { admin, db };
