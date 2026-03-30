(function loadCognidoEnv(){
  var ENV_PATH = './config/config.env';
  if (typeof window === 'undefined') { return; }
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', ENV_PATH, false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 400 && xhr.responseText) {
      var parsed = parseEnv(xhr.responseText);
      window.COGNIDO_CONFIG = buildConfigFromEnv(parsed);
    } else {
      window.COGNIDO_CONFIG = window.COGNIDO_CONFIG || {};
    }
  } catch (err) {
    console.warn('Cognido: could not load config/env file.', err);
    window.COGNIDO_CONFIG = window.COGNIDO_CONFIG || {};
  }

  function parseEnv(text) {
    var result = {};
    text.split(/\r?\n/).forEach(function(line){
      var trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) { return; }
      var idx = trimmed.indexOf('=');
      if (idx === -1) { return; }
      var key = trimmed.slice(0, idx).trim();
      var value = trimmed.slice(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    });
    return result;
  }

  function buildConfigFromEnv(env) {
    var cfg = {};
    if (env.COGNIDO_API_URL) { cfg.apiUrl = env.COGNIDO_API_URL; }
    if (env.COGNIDO_AUTH_KEY) { cfg.authStorageKey = env.COGNIDO_AUTH_KEY; }
    var username = env.COGNIDO_USERNAME;
    var password = env.COGNIDO_PASSWORD;
    if (username || password) {
      cfg.credentials = { username: username || '', password: password || '' };
    }
    return cfg;
  }
})();
