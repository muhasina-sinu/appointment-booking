import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, AdminBookDto } from './dto';
import { Roles, RolesGuard } from '../auth/guards';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'))
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Request() req: any) {
    return this.appointmentsService.create(dto, req.user.id);
  }

  @Post('admin-book')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async adminBook(@Body() dto: AdminBookDto) {
    return this.appointmentsService.adminBook(dto);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('period') period?: string,
  ) {
    // Admin sees all appointments (paginated), user sees their own
    if (req.user.role === Role.ADMIN) {
      const p = Math.max(1, parseInt(page || '1', 10) || 1);
      const l = Math.min(100, Math.max(1, parseInt(limit || '10', 10) || 10));
      return this.appointmentsService.findAll(date, p, l, status, period);
    }
    return this.appointmentsService.findByUser(req.user.id);
  }

  @Get('my')
  async findMy(@Request() req: any) {
    return this.appointmentsService.findByUser(req.user.id);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.appointmentsService.cancel(id, req.user.id, req.user.role);
  }
}
