import { IsString, IsNotEmpty, IsIn, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export const NCR_OUTCOMES = ["ACCEPTED", "REJECTED", "ACCEPTED_WITH_CONCESSION"];

export class ResolveSupplierNcrDto {
  @ApiProperty({
    description: "Disposition outcome",
    enum: NCR_OUTCOMES,
    example: "ACCEPTED",
  })
  @IsString()
  @IsIn(NCR_OUTCOMES)
  outcome: string;

  @ApiProperty({
    description: "Root cause of the non-conformance",
    example: "Supplier's packing line lacked a moisture barrier for this SKU",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  rootCause: string;

  @ApiProperty({
    description: "Corrective / preventive action taken",
    example: "Supplier added a moisture barrier step and will send updated packing SOP",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  correctiveAction: string;

  @ApiProperty({
    description: "Conclusion / resolution summary",
    example: "Replacement shipped and received in good condition",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  resolution: string;
}
