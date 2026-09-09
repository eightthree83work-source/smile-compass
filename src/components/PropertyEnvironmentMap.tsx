"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GeocodeResult, geocodeAddress } from "@/lib/geocoding";
import { NearestStation, fetchNearestStations } from "@/lib/nearestStation";

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border border-ink/15 bg-ink/5 text-sm text-ink/45 sm:h-96">
      地図を読み込み中...
    </div>
  ),
});

const distanceFormatter = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });

const MAX_STATIONS_SHOWN = 5;

interface PropertyEnvironmentMapProps {
  location: string;
}

export default function PropertyEnvironmentMap({ location }: PropertyEnvironmentMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [stations, setStations] = useState<NearestStation[]>([]);
  const [stationError, setStationError] = useState<string | null>(null);

  // 同じ住所に対する連続的な再取得を防ぐ簡易キャッシュ
  const lastFetchedLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = location.trim();

    if (!trimmed) {
      lastFetchedLocationRef.current = null;
      // 所在地が空になった場合、前回分の取得結果を同期的にクリアする必要がある
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeocodeResult(null);
      setGeocodeError(null);
      setStations([]);
      setStationError(null);
      return;
    }

    if (trimmed === lastFetchedLocationRef.current) return;

    const timer = setTimeout(async () => {
      lastFetchedLocationRef.current = trimmed;
      setIsLoading(true);
      setGeocodeError(null);
      setStationError(null);

      let geocoded: GeocodeResult | null = null;
      try {
        geocoded = await geocodeAddress(trimmed);
      } catch {
        geocoded = null;
      }

      if (!geocoded) {
        setGeocodeResult(null);
        setStations([]);
        setGeocodeError("住所から位置情報を取得できませんでした");
        setIsLoading(false);
        return;
      }
      setGeocodeResult(geocoded);

      try {
        const nearestStations = await fetchNearestStations(geocoded.lat, geocoded.lon);
        if (nearestStations) {
          setStations(nearestStations.slice(0, MAX_STATIONS_SHOWN));
        } else {
          setStations([]);
          setStationError("最寄り駅情報を取得できませんでした");
        }
      } catch {
        setStations([]);
        setStationError("最寄り駅情報を取得できませんでした");
      } finally {
        setIsLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [location]);

  const trimmedLocation = location.trim();

  return (
    <div>
      <h3 className="font-heading text-lg text-ink">周辺環境マップ</h3>
      <p className="mt-1 text-sm text-ink/55">
        所在地から周辺の地図・ハザードマップ・最寄り駅を確認できます。
      </p>

      <div className="mt-2 rounded-lg border border-ink/15 bg-white p-4">
        {!trimmedLocation && <p className="text-sm text-ink/55">所在地を入力すると周辺環境マップが表示されます。</p>}

        {trimmedLocation && isLoading && <p className="text-sm text-ink/45">周辺環境を取得中...</p>}

        {trimmedLocation && !isLoading && geocodeError && (
          <p className="text-sm text-[#a12f2f]">{geocodeError}</p>
        )}

        {trimmedLocation && !isLoading && geocodeResult && (
          <>
            <PropertyMap
              lat={geocodeResult.lat}
              lon={geocodeResult.lon}
              matchedAddress={geocodeResult.matchedAddress}
              stations={stations}
            />

            <div className="mt-3">
              <h4 className="text-sm font-medium text-ink/80">最寄り駅</h4>
              {stations.length > 0 ? (
                <ul className="mt-1 space-y-1 text-sm text-ink/70">
                  {stations.map((station) => (
                    <li key={`${station.name}-${station.distanceMeters}`}>
                      {station.name}駅まで直線距離約{distanceFormatter.format(station.distanceMeters)}m
                      {station.lines.length > 0 && (
                        <span className="text-ink/45">（{station.lines.join("、")}）</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                stationError && <p className="mt-1 text-sm text-ink/55">{stationError}</p>
              )}
            </div>

            <div className="mt-4 space-y-1 border-t border-ink/10 pt-3 text-xs text-ink/45">
              <p>地図データ: 国土地理院</p>
              <p>ハザードマップ: 国土交通省ハザードマップポータルサイト</p>
              <p>最寄り駅情報: HeartRails Express（http://express.heartrails.com/）</p>
              <p className="pt-1 text-ink/55">
                このハザードマップは参考情報です。不動産取引における重要事項説明で必要な正式なハザードマップ確認の代わりにはなりません。正式な確認は自治体窓口または不動産会社にご相談ください。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
