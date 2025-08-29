const clientUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://arunbohra-natours.netlify.app'
    : 'http://localhost:5173';

exports.CLIENT_BASE_URL = clientUrl;
