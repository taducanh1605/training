# Sử dụng Node.js image (tự động chọn architecture)
FROM node:18-alpine

# Cài đặt curl cho health check
RUN apk add --no-cache curl

# Tạo thư mục làm việc
WORKDIR /app

# Copy package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production

# Copy toàn bộ source code
COPY . .

# Tạo thư mục cho databases nếu chưa có
RUN mkdir -p db

# Expose port
EXPOSE 2445

# Tạo user không phải root để bảo mật
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Chuyển quyền sở hữu các file cho user nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# Chạy ứng dụng
CMD ["npm", "start"]
