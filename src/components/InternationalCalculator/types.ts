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
