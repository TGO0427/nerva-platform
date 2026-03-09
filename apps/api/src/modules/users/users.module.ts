import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { GdprService } from "./gdpr.service";

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, GdprService],
  exports: [UsersService, GdprService],
})
export class UsersModule {}
