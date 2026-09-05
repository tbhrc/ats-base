#!/bin/sh
set -eu

# /var/www/public is a named volume so wizard-written state (INSTALL_BLOCK,
# attachments, temp) survives a plain container recreate, not just a rebuild.
# Seed it from the image's built-in copy (/var/www/app-image) only on the
# volume's first-ever start; on every later start it's already populated and
# this is a no-op.
if [ ! -f /var/www/public/index.php ]; then
  echo "app_data volume empty, seeding from built image..."
  cp -a /var/www/app-image/. /var/www/public/
fi
chown -R www-data:www-data /var/www/public

# Wait for MySQL to accept connections before starting PHP-FPM/nginx, so the
# install wizard's first request doesn't race a not-yet-ready database.
: "${DATABASE_HOST:=opencatsdb}"
for i in $(seq 1 30); do
  if php -r "exit(@mysqli_connect(getenv('DATABASE_HOST'), getenv('DATABASE_USER'), getenv('DATABASE_PASS')) ? 0 : 1);" 2>/dev/null; then
    echo "database=READY"
    break
  fi
  echo "waiting for database (${i}/30)..."
  sleep 2
done

cd /var/www/public
mkdir -p attachments temp
chown -R www-data:www-data attachments temp

php-fpm -D
exec nginx -g "daemon off;"
