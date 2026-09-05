import { NextRequest, NextResponse } from "next/server";
import { estimateHouseMarketPricePerTsubo, findPrefecture, resolveCityCode } from "@/lib/server/reinfolib";

// このAPI Routeのみが不動産情報ライブラリAPIのキーを扱う。
// クライアントから受け取るのは所在地の文字列のみで、価格・年収など他のProperty情報は一切扱わない。

export async function GET(request: NextRequest) {
  const apiKey = process.env.REINFOLIB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "APIキーが設定されていません。手入力に切り替えてください。" },
      { status: 500 },
    );
  }

  const location = request.nextUrl.searchParams.get("location")?.trim();
  if (!location) {
    return NextResponse.json(
      { error: "所在地が入力されていません。手入力に切り替えてください。" },
      { status: 400 },
    );
  }

  const prefecture = findPrefecture(location);
  if (!prefecture) {
    return NextResponse.json(
      { error: "所在地から都道府県を特定できませんでした。手入力に切り替えてください。" },
      { status: 422 },
    );
  }

  try {
    const city = await resolveCityCode(location, prefecture.code, apiKey);
    if (!city) {
      return NextResponse.json(
        { error: "所在地から市区町村を特定できませんでした。手入力に切り替えてください。" },
        { status: 422 },
      );
    }

    const estimate = await estimateHouseMarketPricePerTsubo(prefecture.code, city.code, apiKey);
    if (!estimate) {
      return NextResponse.json(
        {
          error: `${prefecture.name}${city.name}の戸建て取引データが見つかりませんでした。手入力に切り替えてください。`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      prefecture: prefecture.name,
      city: city.name,
      marketPricePerTsuboManYen: estimate.averagePricePerTsuboManYen,
      sampleSize: estimate.sampleSize,
      years: estimate.years,
    });
  } catch (error) {
    console.error("[land-price] failed to fetch market price", error);
    return NextResponse.json(
      { error: "周辺相場の取得に失敗しました。手入力に切り替えてください。" },
      { status: 502 },
    );
  }
}
