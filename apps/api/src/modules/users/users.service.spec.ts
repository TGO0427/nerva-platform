import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { UsersRepository, User } from './users.repository';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  const mockUser: User = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: 'hashed_password',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findByTenant: jest.fn(),
            countByTenant: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateLastLogin: jest.fn(),
            getUserPermissions: jest.fn(),
            assignRole: jest.fn(),
            removeRole: jest.fn(),
            getUserRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UsersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return null when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('tenant-123', 'test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findByEmail).toHaveBeenCalledWith(
        'tenant-123',
        'test@example.com',
      );
    });
  });

  describe('findByTenant', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      repository.findByTenant.mockResolvedValue(users);
      repository.countByTenant.mockResolvedValue(1);

      const result = await service.findByTenant('tenant-123', 1, 20);

      expect(result).toEqual({
        data: [
          {
            id: mockUser.id,
            tenantId: mockUser.tenantId,
            email: mockUser.email,
            displayName: mockUser.displayName,
            isActive: mockUser.isActive,
            lastLoginAt: mockUser.lastLoginAt,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should calculate correct offset and pages', async () => {
      repository.findByTenant.mockResolvedValue([]);
      repository.countByTenant.mockResolvedValue(45);

      const result = await service.findByTenant('tenant-123', 2, 20);

      expect(repository.findByTenant).toHaveBeenCalledWith('tenant-123', 20, 20);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('should sanitize password hash from response', async () => {
      repository.findByTenant.mockResolvedValue([mockUser]);
      repository.countByTenant.mockResolvedValue(1);

      const result = await service.findByTenant('tenant-123');

      expect(result.data[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'new@example.com',
      displayName: 'New User',
      password: 'password123',
      roleIds: ['role-1', 'role-2'],
    };

    it('should create user successfully', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUser);
      repository.assignRole.mockResolvedValue(undefined);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.create('tenant-123', createDto);

      expect(result).toEqual(mockUser);
      expect(argon2.hash).toHaveBeenCalledWith('password123');
      expect(repository.create).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        email: createDto.email,
        displayName: createDto.displayName,
        passwordHash: 'hashed_password',
      });
    });

    it('should assign roles when provided', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUser);
      repository.assignRole.mockResolvedValue(undefined);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

      await service.create('tenant-123', createDto);

      expect(repository.assignRole).toHaveBeenCalledTimes(2);
      expect(repository.assignRole).toHaveBeenCalledWith(mockUser.id, 'role-1');
      expect(repository.assignRole).toHaveBeenCalledWith(mockUser.id, 'role-2');
    });

    it('should throw ConflictException when email already exists', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create('tenant-123', createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create('tenant-123', createDto)).rejects.toThrow(
        'Email already in use',
      );
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', {
        displayName: 'Updated Name',
      });

      expect(result).toEqual(updatedUser);
      expect(repository.update).toHaveBeenCalledWith('user-123', {
        displayName: 'Updated Name',
      });
    });

    it('should hash password when updating password', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue(mockUser);
      (argon2.hash as jest.Mock).mockResolvedValue('new_hashed_password');

      await service.update('user-123', { password: 'newpassword123' });

      expect(argon2.hash).toHaveBeenCalledWith('newpassword123');
      expect(repository.update).toHaveBeenCalledWith('user-123', {
        passwordHash: 'new_hashed_password',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { displayName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('nonexistent', { displayName: 'Test' }),
      ).rejects.toThrow('User not found');
    });

    it('should update isActive status', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockResolvedValue({ ...mockUser, isActive: false });

      await service.update('user-123', { isActive: false });

      expect(repository.update).toHaveBeenCalledWith('user-123', {
        isActive: false,
      });
    });
  });

  describe('updateLastLogin', () => {
    it('should call repository updateLastLogin', async () => {
      repository.updateLastLogin.mockResolvedValue(undefined);

      await service.updateLastLogin('user-123');

      expect(repository.updateLastLogin).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      const permissions = ['item.read', 'item.write', 'customer.read'];
      repository.getUserPermissions.mockResolvedValue(permissions);

      const result = await service.getUserPermissions('user-123');

      expect(result).toEqual(permissions);
      expect(repository.getUserPermissions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      repository.assignRole.mockResolvedValue(undefined);

      await service.assignRole('user-123', 'role-123');

      expect(repository.assignRole).toHaveBeenCalledWith('user-123', 'role-123');
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      repository.removeRole.mockResolvedValue(undefined);

      await service.removeRole('user-123', 'role-123');

      expect(repository.removeRole).toHaveBeenCalledWith('user-123', 'role-123');
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const roles = [
        { id: 'role-1', name: 'Admin' },
        { id: 'role-2', name: 'User' },
      ];
      repository.getUserRoles.mockResolvedValue(roles);

      const result = await service.getUserRoles('user-123');

      expect(result).toEqual(roles);
      expect(repository.getUserRoles).toHaveBeenCalledWith('user-123');
    });
  });
});
