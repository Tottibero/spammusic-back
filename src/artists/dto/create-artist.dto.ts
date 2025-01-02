import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateArtistDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  description?: string;

  @IsString()
  @MinLength(1)
  image?: string;

  @IsUUID()
  countryId: string;
}
