"use client";

import React, { useState, useEffect, useMemo } from "react";
import CitySelector from "./CitySelector";
import CFTInput from "./CftInput";
import VehicleSizeSelector from "./VehicleSizeSelector";
import QuoteSummary from "./QuoteSummary";
import RateTypeToggle from "./RateTypeToggle";
import { getDistance, getHHGQuoteMap, getVehicleQuotesDict } from "@/lib/api";

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
    if (isNaN(parsedCft)) {
      setError("CFT must be a number");
      return;
    }
    if (parsedCft > 10000) {
      setError("Entered CFT is too large. Please enter a realistic value.");
      return;
    }

    setError(null);
    let total = 0;

    if (houseRate && selectedData) {
      const pack = parseEquation(selectedData.packaging, parsedCft, true);
      const transport = parseEquation(selectedData.transportation, parsedCft);
      setPackagingCost(pack);
      setTransportCost(transport);
      total = pack + transport;

      const dist = await getDistance(source, destination);
      setDistance(dist ?? 0);
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
    }
    setTotalCost(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-[#23272f] max-w-screen mx-auto">
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Shipping Cost Calculator</h2>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <RateTypeToggle
          houseRate={houseRate}
          carRate={carRate}
          onChange={handleRateToggle}
        />

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

        {houseRate && <CFTInput value={cft} onChange={setCft} />}

        {carRate && (
          <VehicleSizeSelector
            carSize={carSize}
            carOptions={carOptions}
            onChange={setCarSize}
          />
        )}

        <button
          onClick={calculateCost}
          disabled={
            (!houseRate && !carRate) ||
            !destination ||
            (houseRate && !cft) ||
            (carRate && !carSize)
          }
          className="w-full py-2 px-4 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Calculate
        </button>

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

        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 italic">
          <p>
            The above rates are indicative rates including our margins. <br />
            Before giving final rates, consider additional services like
            handyman, lift availability, extra packing for fragile items,
            storage, etc.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DomesticCalculator;
