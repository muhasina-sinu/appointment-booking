import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'slotId must be a valid UUID' })
  slotId: string;
}
