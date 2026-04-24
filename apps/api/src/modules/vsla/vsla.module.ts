import { Module } from '@nestjs/common';

import { VslaController } from './vsla.controller';
import { VslaService } from './vsla.service';

@Module({
  controllers: [VslaController],
  providers: [VslaService],
})
export class VslaModule {}
