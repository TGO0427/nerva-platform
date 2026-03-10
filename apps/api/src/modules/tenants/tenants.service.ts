import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { TenantsRepository, Tenant, Site } from "./tenants.repository";
import { UsersService } from "../users/users.service";
import { RbacService } from "../rbac/rbac.service";
import { EmailService } from "../../common/email/email.service";
import { RegisterTenantDto } from "./dto/register-tenant.dto";

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly usersService: UsersService,
    private readonly rbacService: RbacService,
    private readonly emailService: EmailService,
  ) {}

  async findTenantById(id: string): Promise<Tenant | null> {
    return this.tenantsRepository.findTenantById(id);
  }

  async getTenantsWithStats() {
    return this.tenantsRepository.getTenantsWithStats();
  }

  async getTenantStats(tenantId: string) {
    return this.tenantsRepository.getTenantStats(tenantId);
  }

  async listTenants(): Promise<Tenant[]> {
    return this.tenantsRepository.listTenants();
  }

  async createTenant(data: { name: string; code?: string }): Promise<Tenant> {
    return this.tenantsRepository.createTenant(data);
  }

  async updateTenant(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean }>,
  ): Promise<Tenant> {
    const tenant = await this.tenantsRepository.updateTenant(id, data);
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
    return tenant;
  }

  async findSitesByTenant(tenantId: string): Promise<Site[]> {
    return this.tenantsRepository.findSitesByTenant(tenantId);
  }

  async findSiteById(id: string): Promise<Site | null> {
    return this.tenantsRepository.findSiteById(id);
  }

  async createSite(data: {
    tenantId: string;
    name: string;
    code?: string;
  }): Promise<Site> {
    return this.tenantsRepository.createSite(data);
  }

  async updateSite(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean }>,
  ): Promise<Site> {
    const site = await this.tenantsRepository.updateSite(id, data);
    if (!site) {
      throw new NotFoundException("Site not found");
    }
    return site;
  }

  async registerTenant(dto: RegisterTenantDto) {
    // Check if tenant code already exists
    const existingTenant = await this.tenantsRepository.findTenantByCode(
      dto.tenantCode,
    );
    if (existingTenant) {
      throw new ConflictException("Tenant code is already taken");
    }

    // Check if email already exists across all tenants
    const existingEmail =
      await this.tenantsRepository.findUserByEmailGlobal(dto.email);
    if (existingEmail) {
      throw new ConflictException("Email address is already registered");
    }

    // 1. Create the tenant
    const tenant = await this.tenantsRepository.createTenant({
      name: dto.companyName,
      code: dto.tenantCode,
    });

    this.logger.log(
      `New tenant created: ${tenant.id} (${tenant.code}) - ${tenant.name}`,
    );

    // 2. Create a default site
    const site = await this.tenantsRepository.createSite({
      tenantId: tenant.id,
      name: "Main Site",
      code: "MAIN",
    });

    // 3. Get all permissions and create an Admin role with all of them
    const allPermissions = await this.rbacService.listPermissions();
    const permissionIds = allPermissions.map((p) => p.id);

    const adminRole = await this.rbacService.createRole({
      tenantId: tenant.id,
      name: "Admin",
      description: "Full access administrator role",
      permissionIds,
    });

    // 4. Create the admin user (UsersService handles password hashing)
    const user = await this.usersService.create(tenant.id, {
      email: dto.email,
      displayName: dto.displayName,
      password: dto.password,
      roleIds: [adminRole.id],
    });

    // 5. Assign the user to the default site
    await this.usersService.assignSite(user.id, site.id);

    // 6. Send email verification (non-blocking — failures are logged, not thrown)
    if (this.emailService.isConfigured) {
      try {
        const token = randomBytes(40).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await this.usersService.setVerificationToken(user.id, token, expiresAt);
        await this.emailService.sendVerificationEmail(
          user.email,
          token,
          tenant.id,
        );
        this.logger.log(
          `Verification email sent to ${user.email} for new tenant ${tenant.code}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to send verification email during registration: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Tenant registration complete: ${tenant.code} - admin user ${user.id} (${user.email})`,
    );

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
      },
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      message: `Tenant "${tenant.name}" created successfully. Please check your email to verify your account, then sign in.`,
    };
  }
}
