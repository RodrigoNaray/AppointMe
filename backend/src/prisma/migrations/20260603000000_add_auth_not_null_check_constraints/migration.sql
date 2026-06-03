ALTER TABLE "Client" ADD CONSTRAINT client_auth_present CHECK ("passwordHash" IS NOT NULL OR "googleId" IS NOT NULL);
ALTER TABLE "AdminUser" ADD CONSTRAINT admin_user_auth_present CHECK ("passwordHash" IS NOT NULL OR "googleId" IS NOT NULL);
