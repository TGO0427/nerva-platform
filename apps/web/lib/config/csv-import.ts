export interface CsvColumnMapping {
  header: string;
  field: string;
  required: boolean;
  type: 'string' | 'number';
}

export interface CsvImportConfig {
  title: string;
  columns: CsvColumnMapping[];
  templateFilename: string;
  maxRows: number;
}

export const itemImportConfig: CsvImportConfig = {
  title: 'Import Items',
  templateFilename: 'items-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'SKU', field: 'sku', required: true, type: 'string' },
    { header: 'Description', field: 'description', required: true, type: 'string' },
    { header: 'UOM', field: 'uom', required: false, type: 'string' },
    { header: 'Weight (kg)', field: 'weightKg', required: false, type: 'number' },
    { header: 'Length (cm)', field: 'lengthCm', required: false, type: 'number' },
    { header: 'Width (cm)', field: 'widthCm', required: false, type: 'number' },
    { header: 'Height (cm)', field: 'heightCm', required: false, type: 'number' },
  ],
};

export const customerImportConfig: CsvImportConfig = {
  title: 'Import Customers',
  templateFilename: 'customers-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Code', field: 'code', required: true, type: 'string' },
    { header: 'Name', field: 'name', required: true, type: 'string' },
    { header: 'Email', field: 'email', required: false, type: 'string' },
    { header: 'Phone', field: 'phone', required: false, type: 'string' },
    { header: 'VAT No', field: 'vatNo', required: false, type: 'string' },
    { header: 'Billing Address Line 1', field: 'billingAddressLine1', required: false, type: 'string' },
    { header: 'Billing City', field: 'billingCity', required: false, type: 'string' },
    { header: 'Billing Postal Code', field: 'billingPostalCode', required: false, type: 'string' },
    { header: 'Billing Country', field: 'billingCountry', required: false, type: 'string' },
    { header: 'Shipping Address Line 1', field: 'shippingAddressLine1', required: false, type: 'string' },
    { header: 'Shipping City', field: 'shippingCity', required: false, type: 'string' },
    { header: 'Shipping Postal Code', field: 'shippingPostalCode', required: false, type: 'string' },
    { header: 'Shipping Country', field: 'shippingCountry', required: false, type: 'string' },
  ],
};

export const salesOrderImportConfig: CsvImportConfig = {
  title: 'Import Sales Orders',
  templateFilename: 'sales-orders-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Order Group', field: 'orderGroup', required: true, type: 'number' },
    { header: 'Customer Code', field: 'customerCode', required: true, type: 'string' },
    { header: 'External Ref', field: 'externalRef', required: false, type: 'string' },
    { header: 'Priority', field: 'priority', required: false, type: 'number' },
    { header: 'Requested Ship Date', field: 'requestedShipDate', required: false, type: 'string' },
    { header: 'SKU', field: 'sku', required: true, type: 'string' },
    { header: 'Qty', field: 'qty', required: true, type: 'number' },
    { header: 'Unit Price', field: 'unitPrice', required: false, type: 'number' },
  ],
};

export const workOrderImportConfig: CsvImportConfig = {
  title: 'Import Work Orders',
  templateFilename: 'work-orders-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'SKU', field: 'sku', required: true, type: 'string' },
    { header: 'Qty Ordered', field: 'qtyOrdered', required: true, type: 'number' },
    { header: 'Priority', field: 'priority', required: false, type: 'number' },
    { header: 'Planned Start', field: 'plannedStart', required: false, type: 'string' },
    { header: 'Planned End', field: 'plannedEnd', required: false, type: 'string' },
    { header: 'Notes', field: 'notes', required: false, type: 'string' },
  ],
};

export const purchaseOrderImportConfig: CsvImportConfig = {
  title: 'Import Purchase Orders',
  templateFilename: 'purchase-orders-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Order Group', field: 'orderGroup', required: true, type: 'number' },
    { header: 'Supplier Code', field: 'supplierCode', required: true, type: 'string' },
    { header: 'Expected Date', field: 'expectedDate', required: false, type: 'string' },
    { header: 'Notes', field: 'notes', required: false, type: 'string' },
    { header: 'SKU', field: 'sku', required: true, type: 'string' },
    { header: 'Qty', field: 'qty', required: true, type: 'number' },
    { header: 'Unit Cost', field: 'unitCost', required: false, type: 'number' },
  ],
};

export const adjustmentImportConfig: CsvImportConfig = {
  title: 'Import Stock Adjustments',
  templateFilename: 'adjustments-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Adjustment Group', field: 'adjustmentGroup', required: true, type: 'number' },
    { header: 'Warehouse Name', field: 'warehouseName', required: true, type: 'string' },
    { header: 'Reason', field: 'reason', required: true, type: 'string' },
    { header: 'Notes', field: 'notes', required: false, type: 'string' },
    { header: 'SKU', field: 'sku', required: true, type: 'string' },
    { header: 'Bin Code', field: 'binCode', required: true, type: 'string' },
    { header: 'Qty After', field: 'qtyAfter', required: true, type: 'number' },
    { header: 'Batch No', field: 'batchNo', required: false, type: 'string' },
  ],
};

export const workstationImportConfig: CsvImportConfig = {
  title: 'Import Workstations',
  templateFilename: 'workstations-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Code', field: 'code', required: true, type: 'string' },
    { header: 'Name', field: 'name', required: true, type: 'string' },
    { header: 'Type', field: 'workstationType', required: true, type: 'string' },
    { header: 'Capacity/Hr', field: 'capacityPerHour', required: false, type: 'number' },
    { header: 'Cost/Hr', field: 'costPerHour', required: false, type: 'number' },
    { header: 'Description', field: 'description', required: false, type: 'string' },
  ],
};

export const bomImportConfig: CsvImportConfig = {
  title: 'Import BOMs',
  templateFilename: 'boms-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'BOM Group', field: 'bomGroup', required: true, type: 'number' },
    { header: 'Product SKU', field: 'productSku', required: true, type: 'string' },
    { header: 'Base Qty', field: 'baseQty', required: false, type: 'number' },
    { header: 'UOM', field: 'uom', required: false, type: 'string' },
    { header: 'Notes', field: 'notes', required: false, type: 'string' },
    { header: 'Component SKU', field: 'componentSku', required: true, type: 'string' },
    { header: 'Qty Per', field: 'qtyPer', required: true, type: 'number' },
    { header: 'Scrap %', field: 'scrapPct', required: false, type: 'number' },
    { header: 'Category', field: 'category', required: false, type: 'string' },
  ],
};

export const routingImportConfig: CsvImportConfig = {
  title: 'Import Routings',
  templateFilename: 'routings-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Routing Group', field: 'routingGroup', required: true, type: 'number' },
    { header: 'Product SKU', field: 'productSku', required: true, type: 'string' },
    { header: 'Notes', field: 'notes', required: false, type: 'string' },
    { header: 'Operation Name', field: 'operationName', required: true, type: 'string' },
    { header: 'Workstation Code', field: 'workstationCode', required: false, type: 'string' },
    { header: 'Setup Time (mins)', field: 'setupTimeMins', required: false, type: 'number' },
    { header: 'Run Time (mins)', field: 'runTimeMins', required: true, type: 'number' },
    { header: 'Queue Time (mins)', field: 'queueTimeMins', required: false, type: 'number' },
  ],
};

export const supplierImportConfig: CsvImportConfig = {
  title: 'Import Suppliers',
  templateFilename: 'suppliers-template.xlsx',
  maxRows: 500,
  columns: [
    { header: 'Code', field: 'code', required: true, type: 'string' },
    { header: 'Name', field: 'name', required: true, type: 'string' },
    { header: 'Email', field: 'email', required: false, type: 'string' },
    { header: 'Phone', field: 'phone', required: false, type: 'string' },
    { header: 'VAT No', field: 'vatNo', required: false, type: 'string' },
    { header: 'Contact Person', field: 'contactPerson', required: false, type: 'string' },
    { header: 'Registration No', field: 'registrationNo', required: false, type: 'string' },
    { header: 'Address Line 1', field: 'addressLine1', required: false, type: 'string' },
    { header: 'City', field: 'city', required: false, type: 'string' },
    { header: 'Postal Code', field: 'postalCode', required: false, type: 'string' },
    { header: 'Country', field: 'country', required: false, type: 'string' },
  ],
};
