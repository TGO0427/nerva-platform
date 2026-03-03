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
