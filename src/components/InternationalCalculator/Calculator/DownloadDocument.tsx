import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import MyPDFDocument from "../PdfDocument";
import { BasicDetails } from "../types";

interface TableRow {
  name: string;
  values: Record<string, string>; // margin string → value
}

interface Props {
  basicDetails: BasicDetails;
  margins: string[];
  tableData: Record<string, TableRow[]>;
  partFData: TableRow[];
  totals: string[];
  dateStr: string;
}

export const downloadPDF = async ({
  basicDetails,
  margins,
  tableData,
  partFData,
  totals,
  dateStr,
}: Props) => {
  const blob = await pdf(
    <MyPDFDocument
      basicDetails={basicDetails}
      margins={margins}
      tableData={tableData}
      partFData={partFData}
      totals={totals}
      dateStr={dateStr}
    />
  ).toBlob();

  saveAs(blob, `International_Shipping_Quote_${dateStr}.pdf`);
};
