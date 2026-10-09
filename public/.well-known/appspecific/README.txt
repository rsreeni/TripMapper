Replace this file with the contents of keys/public-key.pem after running:

  npm run tesla:keys

Tesla fetches this exact path over HTTPS with no redirect:

  https://YOUR_DOMAIN/.well-known/appspecific/com.tesla.3p.public-key.pem
