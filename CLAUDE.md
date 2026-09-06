＃回答言語
常に日本語で回答してください。

＃プロジェクト概要
中古戸建て購入検討者（自分自身）向けの意思決定支援アプリ。不動産屋・宅建士・住宅診断士・FPそれぞれの視点を1つの物件データに対して提供する。

＃データモデル
lib/types.tsにProperty型を定義し、全セクションはこれを参照する。物件情報の入力は共通コンポーネント（PropertyForm）で1箇所に集約する。

＃4セクション

不動産プロのサポート：坪単価と周辺相場の比較、割安感判定（lib/valuation.ts）
宅建士のサポート：契約前チェックリスト（lib/legalChecklist.ts、ルールベース）
住宅診断士のサポート：築年数・構造別の内覧チェックポイント（lib/inspectionChecklist.ts）
FPのサポート：ローン返済＋住宅ローン控除＋生涯コスト（lib/calculations.ts）

＃技術方針
計算は基本的にクライアントサイドで完結し、個人の年収・価格等のProperty情報はサーバーに送信・保存しない。各セクションはタブ切り替えで、同じPropertyの状態を共有する。

例外として、不動産プロのサポート（ValuationSection）の「周辺相場を自動取得」機能のみ、所在地（location）の文字列をサーバー側API Route（app/api/land-price/route.ts）経由で国土交通省 不動産情報ライブラリAPIに送信する。この機能で送信するのは所在地のみであり、価格・頭金・世帯年収などそれ以外のProperty情報は送信しない。APIキー（REINFOLIB_API_KEY）は.env.localで管理し、lib/server/reinfolib.ts（サーバー専用）以外からは参照しない。
