import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ConnectIntegrationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  authData?: Record<string, unknown>;
}

export class PostDocumentDto {
  @ApiProperty()
  @IsUUID()
  integrationId: string;

  @ApiProperty()
  @IsObject()
  payload: Record<string, unknown>;
}
