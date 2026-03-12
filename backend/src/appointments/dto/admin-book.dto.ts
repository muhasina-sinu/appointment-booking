import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminBookDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'slotId must be a valid UUID' })
  slotId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Client name must be 100 characters or less' })
  clientName: string;
}
