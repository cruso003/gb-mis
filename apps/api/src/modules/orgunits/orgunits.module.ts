import { Module } from '@nestjs/common';
import { OrgUnitsController } from './orgunits.controller';
import { OrgUnitsService } from './orgunits.service';

@Module({
  controllers: [OrgUnitsController],
  providers: [OrgUnitsService],
  exports: [OrgUnitsService],
})
export class OrgUnitsModule {}
