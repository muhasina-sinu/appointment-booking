import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class AdminBookDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'slotId must be a valid UUID' })
  slotId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Client name must be 100 characters or less' })
  clientName: string;

  @IsString()
  @IsNotEmpty({ message: 'Client phone number is required' })
  @Matches(/^\d{10,15}$/, { message: 'Phone number must be 10–15 digits' })
  clientPhone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  clientEmail?: string;
}
