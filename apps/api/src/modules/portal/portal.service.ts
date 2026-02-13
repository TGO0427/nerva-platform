import { Injectable, NotFoundException } from '@nestjs/common';
import { PortalRepository } from './portal.repository';
import { UploadService } from '../../common/upload/upload.service';

@Injectable()
export class PortalService {
  constructor(
    private readonly repository: PortalRepository,
    private readonly uploadService: UploadService,
  ) {}

  async getDashboard(tenantId: string, customerId: string) {
    return this.repository.getDashboardStats(tenantId, customerId);
  }

  async getOrders(tenantId: string, customerId: string, page: number, limit: number, status?: string) {
    return this.repository.findOrders(tenantId, customerId, page, limit, status);
  }

  async getOrder(tenantId: string, customerId: string, orderId: string) {
    const order = await this.repository.findOrderById(tenantId, customerId, orderId);
    if (!order) throw new NotFoundException('Order not found');
    const lines = await this.repository.findOrderLines(orderId);
    return { ...order, lines };
  }

  async getInvoices(tenantId: string, customerId: string, page: number, limit: number, status?: string) {
    return this.repository.findInvoices(tenantId, customerId, page, limit, status);
  }

  async getInvoice(tenantId: string, customerId: string, invoiceId: string) {
    const invoice = await this.repository.findInvoiceById(tenantId, customerId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getDeliveries(tenantId: string, customerId: string, page: number, limit: number) {
    return this.repository.findDeliveries(tenantId, customerId, page, limit);
  }

  async getDelivery(tenantId: string, customerId: string, stopId: string) {
    const delivery = await this.repository.findDeliveryById(tenantId, customerId, stopId);
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async getPod(tenantId: string, customerId: string, stopId: string) {
    // Verify stop belongs to customer
    const delivery = await this.repository.findDeliveryById(tenantId, customerId, stopId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    const pod = await this.repository.findPodForStop(tenantId, stopId);
    if (!pod) throw new NotFoundException('POD not found');
    return pod;
  }

  async getPodDocumentUrl(tenantId: string, customerId: string, stopId: string, docId: string) {
    // Verify stop belongs to customer
    const delivery = await this.repository.findDeliveryById(tenantId, customerId, stopId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    const docs = await this.repository.findDocuments(tenantId, 'pod', docId);
    if (docs.length === 0) throw new NotFoundException('Document not found');

    const url = await this.uploadService.getPresignedDownloadUrl(docs[0].s3_key);
    return { downloadUrl: url };
  }

  async getReturns(tenantId: string, customerId: string, page: number, limit: number) {
    return this.repository.findReturns(tenantId, customerId, page, limit);
  }

  async getReturn(tenantId: string, customerId: string, rmaId: string) {
    const rma = await this.repository.findReturnById(tenantId, customerId, rmaId);
    if (!rma) throw new NotFoundException('Return not found');
    const lines = await this.repository.findReturnLines(rmaId);
    return { ...rma, lines };
  }

  async createReturn(tenantId: string, customerId: string, userId: string, data: {
    salesOrderId?: string;
    returnType: string;
    reason: string;
    notes?: string;
    lines: Array<{ itemId: string; qtyRequested: number }>;
  }) {
    const rma = await this.repository.createRma({
      tenantId,
      customerId,
      salesOrderId: data.salesOrderId,
      returnType: data.returnType,
      reason: data.reason,
      notes: data.notes,
      createdBy: userId,
    });

    for (const line of data.lines) {
      await this.repository.createRmaLine({
        rmaId: rma.id,
        tenantId,
        itemId: line.itemId,
        qtyRequested: line.qtyRequested,
      });
    }

    return rma;
  }
}
