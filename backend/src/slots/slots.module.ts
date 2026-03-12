import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { SlotsSchedulerService } from './slots-scheduler.service';

@Module({
  controllers: [SlotsController],
  providers: [SlotsService, SlotsSchedulerService],
  exports: [SlotsService],
})
export class SlotsModule {}
