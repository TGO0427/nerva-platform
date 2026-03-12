import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { BillingRepository } from "./billing.repository";
import { PaymentRepository } from "./payment.repository";
import { PaystackService } from "./paystack.service";

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingRepository,
    PaymentRepository,
    PaystackService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
