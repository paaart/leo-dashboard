export type BasicDetails = {
  customerName: string;
  originCity: string;
  originPort: string;
  destinationCity: string;
  destinationCountry: string;
  destinationPort: string;
  mode: string;
  packingCharges: string;
  handlingCharges: string;
  originChargesCustom: string;
  oceanFreight: string;
  dthc: string;
  destination: string;
  calculateGSTVal: boolean;
  volumeInCBM: string | number;
  createdAt?: string;
};

export type QuoteRow = {
  customer_name: string;
  origin_city: string;
  origin_port: string;
  destination_city: string;
  destination_country: string;
  destination_port: string;
  mode: string;
  packing_charges: string;
  handling_charges: string;
  origin_charges_custom: string;
  ocean_freight: string;
  dthc: string;
  destination_charges: string;
  volume_cbm: string;
  calculate_gst_val: boolean;
  created_at: string;
  id: string;
};
