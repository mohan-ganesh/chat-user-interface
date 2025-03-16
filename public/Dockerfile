FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY ./docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy application files
COPY public/ /usr/share/nginx/html/

# Ensure proper permissions
RUN chmod -R 755 /usr/share/nginx/html