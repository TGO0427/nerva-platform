import { IsOptional, IsUUID, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSupplierNcrMetaDto {
  @ApiPropertyOptional({ description: "User ID to assign this NCR to" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: "Due date" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
