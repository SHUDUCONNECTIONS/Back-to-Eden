import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AccountService } from './account.service';

/** Sign-up, sign-in and sign-out under /api/auth. Storage is database/auth-db.ts. */
@Module({
  controllers: [AuthController],
  providers: [AccountService],
})
export class AuthModule {}
