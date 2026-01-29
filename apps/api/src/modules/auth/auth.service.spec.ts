import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: 'hashed_password',
    isActive: true,
    lastLoginAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPermissions = ['item.read', 'item.write'];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            getUserPermissions: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      tenantId: 'tenant-123',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access token and user info on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.getUserPermissions.mockResolvedValue(mockPermissions);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'jwt_token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          displayName: mockUser.displayName,
          tenantId: mockUser.tenantId,
        },
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        loginDto.tenantId,
        loginDto.email,
      );
      expect(usersService.getUserPermissions).toHaveBeenCalledWith(mockUser.id);
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException when account is disabled', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Account is disabled');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should include permissions in JWT payload', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.getUserPermissions.mockResolvedValue(mockPermissions);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt_token');

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        tenantId: mockUser.tenantId,
        email: mockUser.email,
        displayName: mockUser.displayName,
        permissions: mockPermissions,
      });
    });
  });

  describe('validateToken', () => {
    const mockPayload = {
      sub: 'user-123',
      tenantId: 'tenant-123',
      email: 'test@example.com',
      displayName: 'Test User',
      permissions: ['item.read'],
    };

    it('should return payload for valid token', async () => {
      jwtService.verify.mockReturnValue(mockPayload);

      const result = await service.validateToken('valid_token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
    });

    it('should return null for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid_token');

      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.hashPassword('password123');

      expect(result).toBe('hashed_password');
      expect(argon2.hash).toHaveBeenCalledWith('password123');
    });

    it('should throw BadRequestException for short password', async () => {
      await expect(service.hashPassword('short')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.hashPassword('short')).rejects.toThrow(
        'Password must be at least 8 characters long',
      );
    });

    it('should accept password with exactly 8 characters', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

      const result = await service.hashPassword('12345678');

      expect(result).toBe('hashed_password');
    });
  });
});
