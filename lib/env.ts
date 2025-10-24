['DATABASE_URL', 'PY_SVC_URL'].forEach(k => {
  if (!process.env[k]) {
    console.warn(`[env] Missing ${k}`);
  }
});
