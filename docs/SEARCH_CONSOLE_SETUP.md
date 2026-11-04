# Turn on real Google Search Console (free)

Feature is OFF until these env vars are set in Vercel: GSC_ENABLED=true, GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REDIRECT_URI.

1. console.cloud.google.com -> create project "RankPilot".
2. APIs & Services -> Library -> enable "Google Search Console API" (free).
3. OAuth consent screen (Google Auth Platform): External; app name RankPilot; support email; homepage https://rankpilot-five-tan.vercel.app ; privacy https://rankpilot-five-tan.vercel.app/privacy ; terms .../terms.
4. Data access -> add scope https://www.googleapis.com/auth/webmasters.readonly (confirm it is listed as non-sensitive).
5. Clients -> Create OAuth client -> Web application. Authorized redirect URI:
   https://rankpilot-five-tan.vercel.app/gsc/callback
6. Copy Client ID + Secret into Vercel env (Production) with GSC_ENABLED=true and GSC_REDIRECT_URI above. Redeploy.
7. Publish app ("In production"). Submit brand verification (domain ownership of homepage needed; 2-3 business days).
   Note: in "Testing" mode only listed test users can connect and refresh tokens expire after 7 days.
