import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { SlotsService } from './slots.service';
import { CreateSlotDto } from './dto';
import { Roles, RolesGuard } from '../auth/guards';

@Controller('slots')
export class SlotsController {
  constructor(private slotsService: SlotsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateSlotDto) {
    return this.slotsService.create(dto);
  }

  @Get()
  async findAll(@Query('date') date?: string) {
    return this.slotsService.findAvailable(date);
  }

  @Get('all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async findAllAdmin(@Query('date') date?: string) {
    return this.slotsService.findAll(date);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.slotsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.slotsService.remove(id);
  }
}
