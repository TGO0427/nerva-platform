import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { FulfilmentRepository } from './fulfilment.repository';

export interface PickSlipTask {
  binCode: string;
  itemSku: string;
  itemDescription: string;
  qtyToPick: number;
  batchNo: string | null;
  expiryDate: Date | null;
}

export interface PickSlipData {
  waveNo: string;
  warehouseName: string;
  createdAt: Date;
  assignedToName: string | null;
  tasks: PickSlipTask[];
}

export interface PackingSlipLine {
  itemSku: string;
  itemDescription: string;
  qty: number;
  batchNo: string | null;
}

export interface PackingSlipData {
  shipmentNo: string;
  orderNo: string;
  createdAt: Date;
  customerName: string;
  shippingAddress: string;
  lines: PackingSlipLine[];
  totalItems: number;
  totalWeight: number;
}

@Injectable()
export class PdfService {
  constructor(private readonly repository: FulfilmentRepository) {}

  async generatePickSlip(waveId: string): Promise<Buffer> {
    const data = await this.repository.getPickSlipData(waveId);
    if (!data) {
      throw new Error('Pick wave not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('PICK SLIP', { align: 'center' });
      doc.moveDown(0.5);

      // Wave info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Wave No: ${data.waveNo}`, 40, 80);
      doc.text(`Warehouse: ${data.warehouseName}`, 40, 95);
      doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, 300, 80);
      doc.text(`Picker: ${data.assignedToName || '_________________'}`, 300, 95);

      doc.moveDown(2);

      // Table header
      const tableTop = 130;
      const colWidths = [70, 80, 180, 50, 70, 65];
      const headers = ['Bin', 'SKU', 'Description', 'Qty', 'Batch', 'Expiry'];

      doc.font('Helvetica-Bold').fontSize(9);
      let xPos = 40;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      // Draw header line
      doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(9);
      let yPos = tableTop + 25;

      for (const task of data.tasks) {
        if (yPos > 750) {
          doc.addPage();
          yPos = 40;
        }

        xPos = 40;
        const rowData = [
          task.binCode,
          task.itemSku,
          task.itemDescription.substring(0, 35),
          task.qtyToPick.toString(),
          task.batchNo || '-',
          task.expiryDate ? new Date(task.expiryDate).toLocaleDateString() : '-',
        ];

        rowData.forEach((text, i) => {
          doc.text(text, xPos, yPos, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        // Checkbox for picker
        doc.rect(560, yPos - 2, 12, 12).stroke();

        yPos += 20;
      }

      // Footer
      doc.moveDown(3);
      const footerY = Math.max(yPos + 40, 700);
      doc.text('Picked by: _________________________', 40, footerY);
      doc.text('Date: _______________', 300, footerY);
      doc.text('Signature: _________________________', 40, footerY + 25);

      doc.end();
    });
  }

  async generatePackingSlip(shipmentId: string): Promise<Buffer> {
    const data = await this.repository.getPackingSlipData(shipmentId);
    if (!data) {
      throw new Error('Shipment not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('PACKING SLIP', { align: 'center' });
      doc.moveDown(0.5);

      // Shipment info (left)
      doc.fontSize(10).font('Helvetica');
      doc.text(`Shipment No: ${data.shipmentNo}`, 40, 80);
      doc.text(`Order No: ${data.orderNo}`, 40, 95);
      doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, 40, 110);

      // Customer info (right)
      doc.font('Helvetica-Bold').text('Ship To:', 300, 80);
      doc.font('Helvetica');
      doc.text(data.customerName, 300, 95);
      if (data.shippingAddress) {
        doc.text(data.shippingAddress, 300, 110, { width: 200 });
      }

      doc.moveDown(3);

      // Table header
      const tableTop = 160;
      const colWidths = [100, 250, 60, 100];
      const headers = ['SKU', 'Description', 'Qty', 'Batch'];

      doc.font('Helvetica-Bold').fontSize(10);
      let xPos = 40;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      // Draw header line
      doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(10);
      let yPos = tableTop + 25;

      for (const line of data.lines) {
        if (yPos > 700) {
          doc.addPage();
          yPos = 40;
        }

        xPos = 40;
        const rowData = [
          line.itemSku,
          line.itemDescription.substring(0, 50),
          line.qty.toString(),
          line.batchNo || '-',
        ];

        rowData.forEach((text, i) => {
          doc.text(text, xPos, yPos, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        yPos += 20;
      }

      // Summary
      doc.moveTo(40, yPos + 10).lineTo(555, yPos + 10).stroke();
      yPos += 25;

      doc.font('Helvetica-Bold');
      doc.text(`Total Items: ${data.totalItems}`, 40, yPos);
      doc.text(`Total Weight: ${data.totalWeight.toFixed(2)} kg`, 200, yPos);

      // Footer
      const footerY = Math.max(yPos + 60, 720);
      doc.font('Helvetica').fontSize(9);
      doc.text('Packed by: _________________________', 40, footerY);
      doc.text('Date: _______________', 300, footerY);
      doc.text('Checked by: _________________________', 40, footerY + 20);

      doc.end();
    });
  }
}
