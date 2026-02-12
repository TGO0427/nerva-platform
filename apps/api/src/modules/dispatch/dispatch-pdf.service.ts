import { Injectable, NotFoundException } from '@nestjs/common';
import { DispatchRepository } from './dispatch.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  renderCompanyHeader,
  renderDocumentTitle,
  renderDocumentMeta,
  renderTable,
  renderTotals,
  renderNotes,
  renderSignatureBlock,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class DispatchPdfService {
  constructor(
    private readonly repository: DispatchRepository,
    private readonly tenantProfile: TenantProfileService,
  ) {}

  async generate(tripId: string, tenantId: string): Promise<Buffer> {
    // Fetch trip
    const trip = await this.repository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundException('Dispatch trip not found');
    }

    // Fetch stops (already joins customer names and shipment numbers)
    const stops = await this.repository.findStopsByTrip(tripId);

    // Fetch tenant profile
    const profile = await this.tenantProfile.getProfile(tenantId);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'DISPATCH MANIFEST', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'Trip #', value: trip.tripNo },
        { label: 'Date', value: formatDate(trip.plannedDate || trip.createdAt) },
        { label: 'Status', value: trip.status },
      ],
      [
        { label: 'Driver', value: trip.driverName || '-' },
        { label: 'Vehicle', value: trip.vehiclePlate || '-' },
      ],
      y,
    );

    y += 5;

    // Summary totals
    y = renderTotals(doc, [
      { label: 'Total Stops', value: String(trip.totalStops || stops.length) },
      { label: 'Total Weight', value: `${trip.totalWeightKg.toFixed(2)} kg` },
      { label: 'Total CBM', value: trip.totalCbm.toFixed(2), bold: true },
    ], y);

    y += 5;

    // Stops table
    y = renderTable(doc, {
      columns: [
        { key: 'seq', header: 'Seq', width: 35, align: 'center' },
        { key: 'customer', header: 'Customer', width: 130 },
        { key: 'address', header: 'Address', width: 160 },
        { key: 'shipment', header: 'Shipment #', width: 90 },
        { key: 'eta', header: 'ETA', width: 60, align: 'center' },
        { key: 'status', header: 'Status', width: 40, align: 'center' },
      ],
      rows: stops.map((stop) => ({
        seq: String(stop.sequence),
        customer: (stop.customerName || '-').substring(0, 25),
        address: [stop.addressLine1, stop.city].filter(Boolean).join(', ').substring(0, 35),
        shipment: stop.shipmentNo || '-',
        eta: stop.eta ? formatDate(stop.eta) : '-',
        status: stop.status,
      })),
      startY: y,
    });

    // Notes
    y = renderNotes(doc, trip.notes, y);

    // Driver signature block
    y = renderSignatureBlock(doc, y, 'Driver Signature', 'Date');

    // Dispatcher signature block
    renderSignatureBlock(doc, y, 'Dispatcher Signature', 'Date');

    doc.end();
    return bufferPromise;
  }
}
