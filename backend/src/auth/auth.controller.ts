import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/auth.guard';
import { AttemptLimiter, clientIp, tooManyAttempts as tooMany } from '../common/attempt-limiter';
import { AdminService } from '../common/admin.service';
import { Viewer, ViewerInfo, bearerToken } from '../common/viewer.decorator';
import {
  MIN_PASSWORD_LENGTH,
  cleanName,
  createSession,
  createUser,
  deleteSession,
  findUser,
  isValidEmail,
  needsConsent,
  normaliseEmail,
  PRIVACY_POLICY_VERSION,
  pruneSessions,
  recordConsent,
  verifyCredentials,
} from '../database/auth-db';
import { AccountService } from './account.service';

// Per account: strict, this is what stops a password being guessed.
const failedLoginsByEmail = new AttemptLimiter(8, 15 * 60 * 1000);
// Per IP: looser, because a household, school or mobile network shares one
// address and one person's typos must not lock everyone else out.
const failedLoginsByIp = new AttemptLimiter(40, 15 * 60 * 1000);
const registrations = new AttemptLimiter(10, 60 * 60 * 1000);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly admins: AdminService,
    private readonly account: AccountService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(@Req() req: Request, @Body() body: any) {
    const ip = clientIp(req);
    if (registrations.blocked(ip)) throw tooMany();

    const email = normaliseEmail(body?.email);
    const name = cleanName(body?.name);
    const password = String(body?.password ?? '');

    if (!name) throw new BadRequestException('Please enter your name.');
    if (!isValidEmail(email)) throw new BadRequestException('Please enter a valid email address.');
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password.length > 200) throw new BadRequestException('That password is too long.');
    if (body?.acceptedPrivacyPolicy !== true) {
      throw new BadRequestException('Please read and accept the privacy policy to create an account.');
    }

    // Email addresses are not verified yet, so moderator addresses cannot be
    // registered from the web - otherwise anyone could claim one first.
    if (this.admins.isAdminEmail(email)) {
      throw new ConflictException(
        'This address is reserved for a moderator. Its password is set on the server.',
      );
    }
    if (findUser(email)) {
      throw new ConflictException('An account with that email already exists. Try signing in.');
    }

    registrations.record(ip);
    const user = await createUser(email, name, password);
    recordConsent(user.email);
    return this.signedIn(user);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Req() req: Request, @Body() body: any) {
    const email = normaliseEmail(body?.email);
    const password = String(body?.password ?? '').slice(0, 200);
    const ip = clientIp(req);
    const emailKey = `email:${email}`;

    if (failedLoginsByEmail.blocked(emailKey) || failedLoginsByIp.blocked(ip)) throw tooMany();
    if (!email || !password) throw new BadRequestException('Please enter your email and password.');

    const user = await verifyCredentials(email, password);
    if (!user) {
      failedLoginsByEmail.record(emailKey);
      failedLoginsByIp.record(ip);
      // Same message whether the email exists or not.
      throw new UnauthorizedException('That email and password do not match.');
    }

    failedLoginsByEmail.clear(emailKey);
    pruneSessions();
    return this.signedIn(user);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request) {
    const token = bearerToken(req);
    if (token) deleteSession(token);
    return { ok: true };
  }

  /** Lets a client check a stored token is still good when the app opens. */
  @Get('me')
  me(@Viewer() viewer: ViewerInfo) {
    return {
      user: {
        email: viewer.key,
        name: viewer.name,
        isAdmin: this.admins.isAdmin(viewer),
        needsConsent: needsConsent(viewer.key),
      },
    };
  }

  /** Accepting the current privacy policy (at sign-up, or after it changes). */
  @Post('consent')
  @HttpCode(200)
  consent(@Viewer() viewer: ViewerInfo, @Body() body: any) {
    if (body?.acceptedPrivacyPolicy !== true) {
      throw new BadRequestException('Please accept the privacy policy to continue.');
    }
    recordConsent(viewer.key);
    return { ok: true, policyVersion: PRIVACY_POLICY_VERSION };
  }

  /** POPIA right of access: everything stored about the caller, as JSON. */
  @Get('export')
  export(@Viewer() viewer: ViewerInfo) {
    return this.account.exportAll(viewer.key);
  }

  /**
   * POPIA right to deletion. Asks for the password again, so a borrowed
   * signed-in phone cannot erase someone's account.
   */
  @Post('delete-account')
  @HttpCode(200)
  async deleteAccount(@Viewer() viewer: ViewerInfo, @Body() body: any) {
    const ok = await verifyCredentials(viewer.key, String(body?.password ?? '').slice(0, 200));
    if (!ok) throw new UnauthorizedException('That password is not right.');
    return { ok: true, removed: this.account.deleteAll(viewer.key) };
  }

  private signedIn(user: { email: string; name: string }) {
    const session = createSession(user.email);
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        email: user.email,
        name: user.name,
        isAdmin: this.admins.isAdminEmail(user.email),
        needsConsent: needsConsent(user.email),
      },
    };
  }
}
