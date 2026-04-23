import type { OrgUnitLevel } from '@gb-mis/types';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';

import { OrgUnitsService } from './orgunits.service';

@ApiTags('orgunits')
@Controller('orgunits')
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @Get()
  @RequirePermission('DASHBOARD_VIEW')
  @ApiOperation({ summary: 'List org units with optional level/parent filter' })
  findAll(
    @Query('level') level?: OrgUnitLevel,
    @Query('parentId') parentId?: string,
  ) {
    return this.orgUnitsService.findAll({
      ...(level !== undefined && { level }),
      ...(parentId !== undefined && { parentId }),
    });
  }

  @Get('tree')
  @RequirePermission('DASHBOARD_VIEW')
  @ApiOperation({ summary: 'Full org unit hierarchy tree' })
  tree() {
    return this.orgUnitsService.tree();
  }

  @Get(':id')
  @RequirePermission('DASHBOARD_VIEW')
  @ApiOperation({ summary: 'Get a single org unit' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgUnitsService.findOne(id);
  }
}
