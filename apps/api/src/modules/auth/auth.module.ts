import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { JwtStrategy } from './jwt.strategy';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ConfigModule],
  providers: [
    JwtStrategy,
    // Apply JwtAuthGuard globally — routes opt out via @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply PermissionsGuard globally — routes opt in via @RequirePermission()
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [PassportModule],
})
export class AuthModule {}
