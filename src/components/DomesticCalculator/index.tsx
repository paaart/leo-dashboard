"use client";

import React, { useState, useEffect, useMemo } from "react";
import CitySelector from "./CitySelector";
import CFTInput from "./CftInput";
import VehicleSizeSelector from "./VehicleSizeSelector";
import QuoteSummary from "./QuoteSummary";
import RateTypeToggle from "./RateTypeToggle";
import { getDistance, getHHGQuoteMap, getVehicleQuotesDict } from "@/lib/api";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SectionCard,
} from "@/components/shared/DashboardUI";

const DomesticCalculator = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [cft, setCft] = useState("");
  const [packagingCost, setPackagingCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [distance, setDistance] = useState(0);
  const [leoCost, setLeoCost] = useState(0);
  const [carrierCost, setCarrierCost] = useState(0);
  const [carSize, setCarSize] = useState("");
  const [quoteMap, setQuoteMap] = useState<Record<string, QuoteRow[]>>({});
  const [vehicleData, setVehicleData] = useState<
    Record<
      string,
      Record<string, Record<string, { carrier_cost: number; leo_cost: number }>>
    >
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [houseRate, setHouseRate] = useState(true);
  const [carRate, setCarRate] = useState(false);

  interface QuoteRow {
    destination: string;
    packaging: string;
    transportation: string;
  }

  // Fetch HHG data once
  useEffect(() => {
    (async () => {
      try {
        const hhgData = await getHHGQuoteMap();
        setQuoteMap(hhgData);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!source || !destination) return;

    getVehicleQuotesDict(source, destination)
      .then((data) => setVehicleData(data))
      .catch((error) => console.error("Vehicle quote fetch failed:", error));
  }, [source, destination]);

  // Memoized derived data
  const sourceCities = useMemo(() => Object.keys(quoteMap).sort(), [quoteMap]);
  const destinationCities = useMemo(
    () =>
      source ? quoteMap[source]?.map((row) => row.destination).sort() : [],
    [quoteMap, source]
  );
  const selectedData = useMemo(
    () => quoteMap[source]?.find((row) => row.destination === destination),
    [quoteMap, source, destination]
  );
  const carOptions = useMemo(
    () => vehicleData[source]?.[destination] ?? {},
    [vehicleData, source, destination]
  );

  // Formula parser
  const parseEquation = (eq: string, cftVal: number, isPackaging = false) => {
    const match = isPackaging
      ? eq.match(
          /\(\s*([+-]?\d*\.?\d+)\s*\*\s*CFT\s*\+\s*([+-]?\d*\.?\d+)\s*\)\s*\*\s*CFT/
        )
      : eq.match(/([+-]?\d*\.?\d+)\s*\(CFT\)\s*\+\s*([+-]?\d*\.?\d+)/);
    if (!match) return 0;
    const [A, B] = [parseFloat(match[1]), parseFloat(match[2])];
    return isPackaging ? (A * cftVal + B) * cftVal : A * cftVal + B;
  };

  const calculateCost = async () => {
    const parsedCft = parseFloat(cft);

    if (parsedCft > 10000) {
      setError("Entered CFT is too large. Please enter a realistic value.");
      return;
    }

    setError(null);
    let total = 0;

    const dist = await getDistance(source, destination);
    setDistance(dist ?? 0);

    if (houseRate && selectedData) {
      const pack = parseEquation(selectedData.packaging, parsedCft, true);
      const transport = parseEquation(selectedData.transportation, parsedCft);
      setPackagingCost(pack);
      setTransportCost(transport);
      total = pack + transport;
    }

    if (carRate && carSize) {
      const quote = vehicleData[source]?.[destination]?.[carSize];
      setLeoCost(quote?.leo_cost ?? 0);
      setCarrierCost(quote?.carrier_cost ?? 0);
    }

    setTotalCost(total);
  };

  const handleRateToggle = (
    type: "houseRate" | "carRate",
    checked: boolean
  ) => {
    if (type === "houseRate") {
      setHouseRate(checked);
      setCft("");
      setPackagingCost(0);
      setTransportCost(0);
    } else {
      setCarRate(checked);
      setLeoCost(0);
      setCarrierCost(0);
      setCarSize("");
      setPackagingCost(0);
      setTransportCost(0);
    }
    setTotalCost(0);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            eyebrow="Operations"
            title="Domestic Calculator"
            subtitle="Calculate household goods and vehicle transportation quotes for domestic routes."
          />
          <LoadingState label="Loading domestic rates" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="Domestic Calculator"
          subtitle="Calculate household goods and vehicle transportation quotes for domestic routes."
        />

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <SectionCard
          title="Quote Inputs"
          description="Select the route, quote type, and shipment details before calculating."
        >
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                Calculation Options
              </p>
              <RateTypeToggle
                houseRate={houseRate}
                carRate={carRate}
                onChange={handleRateToggle}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <CitySelector
                label="Source City"
                value={source}
                options={sourceCities}
                onChange={setSource}
              />

              <CitySelector
                label="Destination City"
                value={destination}
                options={destinationCities}
                onChange={setDestination}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {houseRate && <CFTInput value={cft} onChange={setCft} />}

              {carRate && (
                <VehicleSizeSelector
                  carSize={carSize}
                  carOptions={carOptions}
                  onChange={setCarSize}
                />
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Rates are indicative and should be reviewed before final
                customer confirmation.
              </p>
              <button
                type="button"
                onClick={calculateCost}
                disabled={
                  !source ||
                  !destination ||
                  (houseRate && !cft) ||
                  (carRate && !carSize)
                }
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Calculate Quote
              </button>
            </div>
          </div>
        </SectionCard>

        <QuoteSummary
          showHHG={houseRate}
          showVehicle={carRate}
          packagingCost={packagingCost}
          transportCost={transportCost}
          totalCost={totalCost}
          leoCost={leoCost}
          carrierCost={carrierCost}
          distance={distance}
        />

        {!houseRate && !carRate ? (
          <EmptyState
            title="No calculation option selected"
            description="Choose household goods, vehicle transportation, or both to prepare a quote."
          />
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
          The above rates are indicative rates including our margins. Before
          giving final rates, consider additional services like handyman, lift
          availability, extra packing for fragile items, storage, etc.
        </div>
      </div>
    </div>
  );
};

export default DomesticCalculator;
