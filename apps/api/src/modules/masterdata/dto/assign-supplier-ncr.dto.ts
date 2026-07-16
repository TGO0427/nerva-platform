import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignSupplierNcrDto {
  @ApiProperty({ description: "User ID to assign this NCR to" })
  @IsUUID()
  userId: string;
}
