import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationsRepository, IntegrationConnection } from './integrations.repository';

@Injectable()
export class IntegrationsService {
  constructor(private readonly repository: IntegrationsRepository) {}

  async createConnection(data: {
    tenantId: string;
    type: string;
    name: string;
    configJson?: Record<string, unknown>;
  }): Promise<IntegrationConnection> {
    return this.repository.createConnection(data);
  }

  async getConnection(id: string): Promise<IntegrationConnection> {
    const connection = await this.repository.findConnectionById(id);
    if (!connection) throw new NotFoundException('Integration connection not found');
    return connection;
  }

  async listConnections(tenantId: string): Promise<IntegrationConnection[]> {
    return this.repository.findConnectionsByTenant(tenantId);
  }

  async updateConnectionStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<IntegrationConnection> {
    const connection = await this.repository.updateConnectionStatus(id, status, errorMessage);
    if (!connection) throw new NotFoundException('Integration connection not found');
    return connection;
  }

  async updateConnectionConfig(
    id: string,
    configJson: Record<string, unknown>,
  ): Promise<IntegrationConnection> {
    const connection = await this.repository.updateConnectionConfig(id, configJson);
    if (!connection) throw new NotFoundException('Integration connection not found');
    return connection;
  }

  async connect(id: string, authData: Record<string, unknown>): Promise<IntegrationConnection> {
    const connection = await this.getConnection(id);

    // Store auth tokens securely (in real app, encrypt these)
    const configJson = {
      ...connection.configJson,
      ...authData,
    };

    await this.repository.updateConnectionConfig(id, configJson);
    return this.repository.updateConnectionStatus(id, 'CONNECTED') as Promise<IntegrationConnection>;
  }

  async disconnect(id: string): Promise<IntegrationConnection> {
    await this.getConnection(id);
    return this.repository.updateConnectionStatus(id, 'DISCONNECTED') as Promise<IntegrationConnection>;
  }
}
