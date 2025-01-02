import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class BoolintunesDto {
  @IsString()
  @IsNotEmpty()
  month: string;

  @IsOptional()
  @IsNumber()
  day?: number;
}

export class HeavyMusicHQDto {
  @IsString()
  @IsNotEmpty()
  month: string;

  @IsOptional()
  @IsNumber()
  day?: number;

  @IsOptional()
  @IsBoolean()
  save?: boolean;
}
