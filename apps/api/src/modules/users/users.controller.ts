import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Role } from '@gb-mis/types';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import { UsersService } from './users.service';
import { CreateUserSchema, type CreateUserDto } from './dto/create-user.dto';
import { UpdateUserSchema, type UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'List all users with pagination' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page: Number(page), limit: Number(limit), search });
  }

  @Get(':id')
  @RequirePermission('users:read')
  @AuditEvent('READ', 'User')
  @ApiOperation({ summary: 'Get a single user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermission('users:create')
  @AuditEvent('CREATE', 'User')
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  @ApiOperation({ summary: 'Create a new user account (provisioned by admin after Keycloak invite)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('users:update')
  @AuditEvent('UPDATE', 'User')
  @ApiOperation({ summary: 'Update user profile or status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/roles/:role')
  @RequirePermission('users:assign-role')
  @AuditEvent('UPDATE', 'UserRole')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: Role,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.assignRole(id, role, actor.id);
  }

  @Delete(':id/roles/:role')
  @RequirePermission('users:assign-role')
  @AuditEvent('UPDATE', 'UserRole')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  revokeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: Role,
  ) {
    return this.usersService.revokeRole(id, role);
  }

  @Delete(':id')
  @RequirePermission('users:deactivate')
  @AuditEvent('UPDATE', 'User')
  @ApiOperation({ summary: 'Deactivate a user account (soft delete)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }
}
