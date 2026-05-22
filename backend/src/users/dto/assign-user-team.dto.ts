import { IsNotEmpty, IsString } from 'class-validator';

export class AssignUserTeamDto {
  @IsString()
  @IsNotEmpty()
  teamId: string;
}
