const admin = require("firebase-admin");

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_ADMIN_SDK;
  if (!raw) throw new Error("FIREBASE_ADMIN_SDK не встановлено в env");

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error("FIREBASE_ADMIN_SDK має бути валідним JSON");
  }

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = { admin };
