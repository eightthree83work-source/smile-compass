"use client";

import { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NearestStation } from "@/lib/nearestStation";

interface HazardLayerDef {
  id: string;
  label: string;
  /** 1つのトグルで複数タイルを重ねる場合があるため配列にする（例：土砂災害警戒区域） */
  tileUrls: string[];
}

const HAZARD_LAYERS: HazardLayerDef[] = [
  {
    id: "flood",
    label: "洪水浸水想定区域（想定最大規模）",
    tileUrls: ["https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png"],
  },
  {
    id: "sediment",
    label: "土砂災害警戒区域",
    tileUrls: [
      "https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png",
      "https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png",
      "https://disaportaldata.gsi.go.jp/raster/05_jisuberikeikaikuiki/{z}/{x}/{y}.png",
    ],
  },
  {
    id: "tsunami",
    label: "津波浸水想定",
    tileUrls: ["https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png"],
  },
];

const ACCENT_COLOR = "#e8654a";
const INK_COLOR = "#1a2420";

const propertyIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="${ACCENT_COLOR}" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="16" r="5.5" fill="white"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -38],
});

const stationIcon = L.divIcon({
  className: "",
  html: `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="9" r="6.5" fill="${INK_COLOR}" stroke="white" stroke-width="2"/>
  </svg>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9],
});

interface PropertyMapProps {
  lat: number;
  lon: number;
  matchedAddress: string;
  stations: NearestStation[];
}

export default function PropertyMap({ lat, lon, matchedAddress, stations }: PropertyMapProps) {
  const [activeHazardIds, setActiveHazardIds] = useState<Record<string, boolean>>({});

  const center = useMemo<[number, number]>(() => [lat, lon], [lat, lon]);

  const toggleHazard = (id: string) => {
    setActiveHazardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {HAZARD_LAYERS.map((layer) => (
          <label key={layer.id} className="flex items-center gap-1.5 text-sm text-ink/75">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink/25 text-accent focus:ring-accent"
              checked={Boolean(activeHazardIds[layer.id])}
              onChange={() => toggleHazard(layer.id)}
            />
            {layer.label}
          </label>
        ))}
      </div>

      <div className="h-72 w-full overflow-hidden rounded-lg border border-ink/15 sm:h-96">
        <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
            url="https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
            maxNativeZoom={18}
            maxZoom={19}
          />

          {HAZARD_LAYERS.filter((layer) => activeHazardIds[layer.id]).flatMap((layer) =>
            layer.tileUrls.map((url) => (
              <TileLayer key={url} url={url} maxNativeZoom={17} maxZoom={19} opacity={0.6} />
            )),
          )}

          <Marker position={center} icon={propertyIcon}>
            <Popup>{matchedAddress}</Popup>
          </Marker>

          {stations.map((station) => (
            <Marker key={`${station.name}-${station.distanceMeters}`} position={[station.lat, station.lon]} icon={stationIcon}>
              <Popup>
                {station.name}駅
                {station.lines.length > 0 && (
                  <>
                    <br />
                    {station.lines.join("、")}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
