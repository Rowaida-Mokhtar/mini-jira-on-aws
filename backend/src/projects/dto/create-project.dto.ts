import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsNotEmpty()
  teamId: string;
}
