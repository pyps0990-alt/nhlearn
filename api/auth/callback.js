/**
 * OAuth Callback Handler for Vercel
 * Receives the auth code, exchanges it for tokens server-side,
 * and redirects back to the SPA with the user credentials.
 */
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/');
  }

  try {
    const clientID = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // NOTE: redirect_uri must EXACTLY match the one configured in Google Console
    const redirectURI = process.env.VITE_REDIRECT_URI || 'https://nhlearn.vercel.app/api/auth/callback';

    if (!clientSecret) {
      console.error("Missing GOOGLE_CLIENT_SECRET environment variable");
      return res.redirect('/?auth_error=configuration_error');
    }

    // Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectURI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("Token exchange error:", tokens.error_description || tokens.error);
      return res.redirect(`/?auth_error=${encodeURIComponent(tokens.error)}`);
    }

    // We pass the access_token and id_token back to the SPA via query params
    // The SPA will use id_token to authenticate with Firebase
    const params = new URLSearchParams({
      access_token: tokens.access_token,
      id_token: tokens.id_token || '',
      expires_in: tokens.expires_in
    });

    return res.redirect(`/?${params.toString()}`);
  } catch (err) {
    console.error("Callback handler internal error:", err);
    return res.redirect('/?auth_error=internal_server_error');
  }
}
