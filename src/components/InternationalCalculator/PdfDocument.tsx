import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

// Types
interface BasicDetails {
  customerName: string;
  originCity: string;
  originPort: string;
  destinationCity: string;
  destinationCountry: string;
  destinationPort: string;
  mode: string;
  volumeInCBM: string | number;
}

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

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    flexDirection: "column",
  },
  heading: {
    fontSize: 12,
    marginBottom: 3,
    fontWeight: "bold",
    textAlign: "center",
  },
  infoContainer: {
    marginBottom: 5,
  },
  infoLine: {
    marginBottom: 1,
  },
  boldText: {
    fontWeight: "bold",
  },
  table: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 0.5,
    borderColor: "#aaa",
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
  },
  colLabel: {
    width: "35%",
    borderRightColor: "#aaa",
    borderRightWidth: 0.5,
    borderBottomColor: "#aaa",
    borderBottomWidth: 0.5,
    padding: 2,
    flexWrap: "wrap",
    textAlign: "left",
  },
  colMargin: {
    width: "16.25%",
    borderRightColor: "#aaa",
    borderRightWidth: 0.5,
    borderBottomColor: "#aaa",
    borderBottomWidth: 0.5,
    padding: 2,
    textAlign: "center",
    flexWrap: "wrap",
  },
  lastMarginCol: {
    width: "16.25%",
    borderBottomColor: "#aaa",
    borderBottomWidth: 0.5,
    padding: 2,
    textAlign: "center",
    flexWrap: "wrap",
  },
  partHeaderBg: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  headerBgGreen: {
    backgroundColor: "#ffffff",
    fontWeight: "bold",
  },
});

// Component
const MyPDFDocument: React.FC<Props> = ({
  basicDetails,
  margins,
  tableData,
  partFData,
  totals,
  dateStr,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>International Shipping Rates</Text>

        <View style={styles.infoContainer}>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Date: </Text>
            {dateStr}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Customer Name: </Text>
            {basicDetails.customerName}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Origin City: </Text>
            {basicDetails.originCity}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Origin Port: </Text>
            {basicDetails.originPort}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Destination City: </Text>
            {basicDetails.destinationCity}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Destination Country: </Text>
            {basicDetails.destinationCountry}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Destination Port: </Text>
            {basicDetails.destinationPort}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Mode: </Text>
            {basicDetails.mode}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.boldText}>Volume in CBM: </Text>
            {basicDetails.volumeInCBM}
          </Text>
        </View>

        {/* Table for Parts A–E */}
        {Object.entries(tableData).map(([partKey, rows], index) => (
          <View style={styles.table} key={index}>
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.colLabel,
                  styles.partHeaderBg,
                  { borderRightWidth: 0 },
                ]}
              >
                Part {partKey}
              </Text>
              {margins.map((_, idx) => (
                <Text
                  key={idx}
                  style={
                    idx === margins.length - 1
                      ? [styles.lastMarginCol, styles.partHeaderBg]
                      : [styles.colMargin, styles.partHeaderBg]
                  }
                ></Text>
              ))}
            </View>

            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.colLabel,
                  styles.headerBgGreen,
                  { textAlign: "center" },
                ]}
              ></Text>
              {margins.map((marginVal, idx) => (
                <Text
                  key={idx}
                  style={
                    idx === margins.length - 1
                      ? [styles.lastMarginCol, styles.headerBgGreen]
                      : [styles.colMargin, styles.headerBgGreen]
                  }
                >
                  {marginVal} Margin
                </Text>
              ))}
            </View>

            {rows.map((row, rIdx) => (
              <View style={styles.tableRow} key={rIdx}>
                <Text style={styles.colLabel}>{row.name}</Text>
                {margins.map((mVal, mIndex) => (
                  <Text
                    key={mIndex}
                    style={
                      mIndex === margins.length - 1
                        ? styles.lastMarginCol
                        : styles.colMargin
                    }
                  >
                    {row.values[mVal]}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}

        {/* Final Totals Row */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.colLabel, styles.boldText]}>
              Total (Net Total + Total GST)
            </Text>
            {totals.map((val, idx) => (
              <Text
                key={idx}
                style={
                  idx === totals.length - 1
                    ? [styles.lastMarginCol, styles.boldText]
                    : [styles.colMargin, styles.boldText]
                }
              >
                {val}
              </Text>
            ))}
          </View>
        </View>

        {/* Part F Table */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.colLabel,
                styles.partHeaderBg,
                { borderRightWidth: 0 },
              ]}
            >
              Part F
            </Text>
            {margins.map((_, idx) => (
              <Text
                key={idx}
                style={
                  idx === margins.length - 1
                    ? [styles.lastMarginCol, styles.partHeaderBg]
                    : [styles.colMargin, styles.partHeaderBg]
                }
              ></Text>
            ))}
          </View>

          {partFData.map((row, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colLabel}>{row.name}</Text>
              {margins.map((mVal, mIdx) => (
                <Text
                  key={mIdx}
                  style={
                    mIdx === margins.length - 1
                      ? styles.lastMarginCol
                      : styles.colMargin
                  }
                >
                  {row.values[mVal]}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={{ marginTop: 5, textAlign: "center" }}>
          Thank you for using our service!
        </Text>
      </Page>
    </Document>
  );
};

export default MyPDFDocument;
