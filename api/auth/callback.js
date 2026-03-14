/**
 * OAuth Callback Handler for Vercel
 * Receives the auth code and redirects back to the SPA
 */
export default function handler(req, res) {
  const { code, state, scope, error } = req.query;

  // If there's an error from Google, pass it back
  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
  }

  // If we have a code, redirect back to the SPA root
  if (code) {
    const params = new URLSearchParams({ code });
    if (state) params.append('state', state);
    if (scope) params.append('scope', scope);
    
    // Redirect to root where the SPA can process the code
    return res.redirect(`/?${params.toString()}`);
  }

  // Fallback
  res.redirect('/');
}
